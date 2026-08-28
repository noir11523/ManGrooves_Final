<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

$currentUser = Auth::requireRoles('system_admin');
$pdo = Database::connection();
$trends = ['Increasing', 'Stable', 'Decreasing', 'Unknown'];

if (is_post()) {
    Csrf::validateOrFail();
    $action = scalar_string($_POST['action'] ?? null, 'save');
    $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT) ?: null;
    try {
        if ($action === 'delete') {
            if (!$id) {
                throw new InvalidArgumentException('Select a valid species.');
            }
            Database::transaction(static function (PDO $pdo) use ($id): void {
                $lock = $pdo->prepare('SELECT id FROM mangrove_species WHERE id = :id LIMIT 1 FOR UPDATE');
                $lock->execute(['id' => $id]);
                if (!$lock->fetchColumn()) {
                    throw new DomainException('The species no longer exists.');
                }
                $usage = $pdo->prepare(
                    'SELECT
                        (SELECT COUNT(*) FROM reports WHERE suggested_species_id = :suggested_id) +
                        (SELECT COUNT(*) FROM reports WHERE final_species_id = :final_id) +
                        (SELECT COUNT(*) FROM mangrove_clusters WHERE species_id = :cluster_id) AS usage_count'
                );
                $usage->execute(['suggested_id' => $id, 'final_id' => $id, 'cluster_id' => $id]);
                if ((int) $usage->fetchColumn() > 0) {
                    throw new DomainException('A species used by reports or clusters cannot be deleted. Mark it inactive instead.');
                }
                $delete = $pdo->prepare('DELETE FROM mangrove_species WHERE id = :id');
                $delete->execute(['id' => $id]);
                Audit::logRequired('admin.species_deleted', 'mangrove_species', $id);
            });
            flash('success', 'Species deleted.');
            redirect('admin/species.php');
        }

        $scientificName = trim(scalar_string($_POST['scientific_name'] ?? null));
        $commonName = trim(scalar_string($_POST['common_name'] ?? null));
        $rootType = trim(scalar_string($_POST['root_type'] ?? null));
        $leafShape = trim(scalar_string($_POST['leaf_shape'] ?? null));
        $barkTexture = trim(scalar_string($_POST['bark_texture'] ?? null));
        $trend = scalar_string($_POST['population_trend'] ?? null, 'Unknown');
        if ($scientificName === '' || $commonName === '' || $rootType === '' || $leafShape === '' || $barkTexture === '') {
            throw new InvalidArgumentException('Scientific name, common name, root type, leaf shape, and bark texture are required.');
        }
        if (!in_array($trend, $trends, true)) {
            throw new InvalidArgumentException('Choose a valid population trend.');
        }
        $data = [
            'scientific_name' => mb_substr($scientificName, 0, 190),
            'common_name' => mb_substr($commonName, 0, 190),
            'local_name' => admin_nullable_text($_POST['local_name'] ?? null, 255),
            'family' => admin_nullable_text($_POST['family'] ?? null, 120),
            'iucn_code' => admin_nullable_text($_POST['iucn_code'] ?? null, 10),
            'iucn_label' => admin_nullable_text($_POST['iucn_label'] ?? null, 60),
            'population_trend' => $trend,
            'root_type' => mb_substr($rootType, 0, 190),
            'root_type_image' => admin_nullable_text($_POST['root_type_image'] ?? null, 255),
            'leaf_shape' => mb_substr($leafShape, 0, 190),
            'leaf_shape_image' => admin_nullable_text($_POST['leaf_shape_image'] ?? null, 255),
            'bark_texture' => mb_substr($barkTexture, 0, 255),
            'bark_texture_image' => admin_nullable_text($_POST['bark_texture_image'] ?? null, 255),
            'provenance' => admin_nullable_text($_POST['provenance'] ?? null, 255),
            'active' => scalar_string($_POST['active'] ?? null) === '1' ? 1 : 0,
        ];
        if ($id) {
            $data['id'] = $id;
            $update = $pdo->prepare(
                'UPDATE mangrove_species SET scientific_name = :scientific_name, common_name = :common_name,
                    local_name = :local_name, family = :family, iucn_code = :iucn_code, iucn_label = :iucn_label,
                    population_trend = :population_trend, root_type = :root_type, root_type_image = :root_type_image,
                    leaf_shape = :leaf_shape, leaf_shape_image = :leaf_shape_image, bark_texture = :bark_texture,
                    bark_texture_image = :bark_texture_image, provenance = :provenance, active = :active
                 WHERE id = :id'
            );
            $update->execute($data);
            Audit::log('admin.species_updated', 'mangrove_species', $id);
            flash('success', 'Species updated.');
        } else {
            $insert = $pdo->prepare(
                'INSERT INTO mangrove_species
                    (scientific_name, common_name, local_name, family, iucn_code, iucn_label, population_trend,
                     root_type, root_type_image, leaf_shape, leaf_shape_image, bark_texture, bark_texture_image,
                     provenance, active)
                 VALUES
                    (:scientific_name, :common_name, :local_name, :family, :iucn_code, :iucn_label, :population_trend,
                     :root_type, :root_type_image, :leaf_shape, :leaf_shape_image, :bark_texture, :bark_texture_image,
                     :provenance, :active)'
            );
            $insert->execute($data);
            $id = (int) $pdo->lastInsertId();
            Audit::log('admin.species_created', 'mangrove_species', $id);
            flash('success', 'Species created.');
        }
    } catch (InvalidArgumentException|DomainException $exception) {
        flash('danger', $exception->getMessage());
        remember_old_input($_POST);
        redirect('admin/species.php' . ($id ? '?edit=' . $id : ''));
    } catch (PDOException $exception) {
        flash('danger', $exception->getCode() === '23000'
            ? 'That scientific name already exists or the species is still in use.'
            : 'The species could not be saved.');
        remember_old_input($_POST);
        redirect('admin/species.php' . ($id ? '?edit=' . $id : ''));
    }
    redirect('admin/species.php');
}

function admin_nullable_text(mixed $value, int $max): ?string
{
    $value = trim(scalar_string($value));
    return $value === '' ? null : mb_substr($value, 0, $max);
}

$editId = filter_var($_GET['edit'] ?? null, FILTER_VALIDATE_INT) ?: null;
$editing = null;
if ($editId) {
    $editStatement = $pdo->prepare('SELECT * FROM mangrove_species WHERE id = :id LIMIT 1');
    $editStatement->execute(['id' => $editId]);
    $editing = $editStatement->fetch() ?: null;
}
$search = mb_substr(trim(scalar_string($_GET['q'] ?? null)), 0, 100);
$activeFilter = scalar_string($_GET['active'] ?? null);
$clauses = ['1 = 1'];
$params = [];
if ($search !== '') {
    $clauses[] = '(scientific_name LIKE :scientific OR common_name LIKE :common OR local_name LIKE :local)';
    $like = '%' . $search . '%';
    $params = ['scientific' => $like, 'common' => $like, 'local' => $like];
}
if (in_array($activeFilter, ['0', '1'], true)) {
    $clauses[] = 'active = :active';
    $params['active'] = (int) $activeFilter;
}
$statement = $pdo->prepare('SELECT * FROM mangrove_species WHERE ' . implode(' AND ', $clauses) . ' ORDER BY active DESC, common_name, scientific_name');
$statement->execute($params);

render('admin/species', [
    'pageTitle' => 'Species management',
    'currentUser' => $currentUser,
    'speciesRows' => $statement->fetchAll(),
    'editing' => $editing,
    'trends' => $trends,
    'search' => $search,
    'activeFilter' => $activeFilter,
]);
