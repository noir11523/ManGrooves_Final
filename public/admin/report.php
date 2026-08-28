<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/app/bootstrap.php';

use App\Services\VerificationService;

$user = Auth::requireRoles('expert', 'system_admin');
$reportId = filter_var($_POST['report_id'] ?? $_GET['id'] ?? null, FILTER_VALIDATE_INT);
if (!$reportId || $reportId < 1) {
    http_response_code(404);
    exit('Report not found.');
}

if (is_post()) {
    Csrf::validateOrFail();
    try {
        $result = (new VerificationService(Database::connection()))->review((int) $reportId, (int) $user['id'], $_POST);
        $message = $result['status'] === 'verified' ? 'Report verified successfully.' : 'Report rejected and feedback sent.';
        if (!empty($result['new_badges'])) {
            $message .= ' The guardian earned ' . count($result['new_badges']) . ' new badge(s).';
        }
        flash('success', $message);
        redirect('admin/verification.php?view=' . ($result['status'] === 'verified' ? 'history' : 'queue'));
    } catch (InvalidArgumentException|DomainException $exception) {
        flash('danger', $exception->getMessage());
        remember_old_input($_POST);
        redirect('admin/report.php?id=' . (int) $reportId);
    } catch (Throwable $exception) {
        if ((bool) config('debug', false)) {
            error_log('Verification failed: ' . $exception->getMessage());
        }
        flash('danger', 'The review could not be saved. No changes were committed; please try again.');
        redirect('admin/report.php?id=' . (int) $reportId);
    }
}

$pdo = Database::connection();
$statement = $pdo->prepare(
    "SELECT r.*, u.full_name AS guardian_name, u.email AS guardian_email, u.phone AS guardian_phone,
            b.name AS barangay_name, b.city_municipality, b.province,
            ss.common_name AS suggested_common_name, ss.scientific_name AS suggested_scientific_name,
            fs.common_name AS final_common_name, fs.scientific_name AS final_scientific_name,
            c.name AS cluster_name, c.cluster_code, c.initial_seedlings,
            e.full_name AS expert_name
     FROM reports r
     JOIN users u ON u.id = r.user_id
     JOIN barangays b ON b.id = r.barangay_id
     LEFT JOIN mangrove_species ss ON ss.id = r.suggested_species_id
     LEFT JOIN mangrove_species fs ON fs.id = r.final_species_id
     LEFT JOIN mangrove_clusters c ON c.id = r.cluster_id
     LEFT JOIN users e ON e.id = r.expert_id
     WHERE r.id = :id LIMIT 1"
);
$statement->execute(['id' => $reportId]);
$report = $statement->fetch();
if (!$report) {
    http_response_code(404);
    exit('Report not found.');
}

$observationsStatement = $pdo->prepare(
    'SELECT COALESCE(ro.criterion_name_snapshot, hc.name) AS criterion_name,
            COALESCE(ro.criteria_code_snapshot, hc.code) AS criterion_code,
            COALESCE(ro.score_group_snapshot, hc.score_group) AS score_group,
            COALESCE(ro.option_label_snapshot, ho.label) AS option_label,
            ro.points_snapshot
     FROM report_observations ro
     LEFT JOIN health_criteria hc ON hc.id = ro.criteria_id
     LEFT JOIN health_options ho ON ho.id = ro.option_id
     WHERE ro.report_id = :report_id
     ORDER BY COALESCE(ro.criteria_order_snapshot, hc.display_order), ro.criteria_id,
              COALESCE(ro.option_order_snapshot, ho.display_order), ro.option_id'
);
$observationsStatement->execute(['report_id' => $reportId]);
$observations = $observationsStatement->fetchAll();

$logStatement = $pdo->prepare(
    'SELECT vl.*, u.full_name AS verifier_name,
            ps.common_name AS previous_species_name, ns.common_name AS new_species_name
     FROM verification_logs vl
     JOIN users u ON u.id = vl.verifier_id
     LEFT JOIN mangrove_species ps ON ps.id = vl.previous_species_id
     LEFT JOIN mangrove_species ns ON ns.id = vl.new_species_id
     WHERE vl.report_id = :report_id ORDER BY vl.created_at DESC, vl.id DESC'
);
$logStatement->execute(['report_id' => $reportId]);
$logs = $logStatement->fetchAll();

$species = $pdo->query(
    'SELECT id, common_name, scientific_name, iucn_code FROM mangrove_species WHERE active = 1 ORDER BY common_name, scientific_name'
)->fetchAll();

render('admin/report', [
    'pageTitle' => 'Review ' . $report['report_code'],
    'currentUser' => $user,
    'report' => $report,
    'observations' => $observations,
    'logs' => $logs,
    'species' => $species,
]);
