<?php
declare(strict_types=1);
require_once dirname(__DIR__, 2) . '/app/bootstrap.php';
$user = Auth::requireRoles('system_admin');
$service = new \App\Services\ChecklistService(Database::connection());
$error = null;
if (is_post()) {
    Csrf::validateOrFail();
    try {
        $service->save($user, $_POST, $_FILES);
        flash('success', 'Checklist saved. New reports use these settings.');
        redirect('admin/checklist.php#criterion-' . (int) $_POST['id']);
    } catch (PDOException $exception) {
        throw $exception;
    } catch (InvalidArgumentException | RuntimeException $exception) {
        $error = $exception->getMessage();
    }
}
render('admin/checklist', ['pageTitle' => 'Health checklist', 'criteria' => $service->data(), 'error' => $error, 'pageScripts' => '<script src="' . e(asset('js/checklist-editor.js') . '?v=' . filemtime(APP_ROOT . '/public/assets/js/checklist-editor.js')) . '"></script>']);
