<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/app/bootstrap.php';

use App\Services\ReportService;

$user = Auth::requireRoles('guardian');
$service = new ReportService(Database::connection());
$errors = [];

if (is_post()) {
    $submittedToken = $_POST['csrf_token'] ?? null;
    if (!is_string($submittedToken) || !Csrf::isValid($submittedToken)) {
        send_http_status(419);
        exit('Your form session expired. Please return to the previous page, refresh it, and try again.');
    }
    remember_old_input($_POST);
    try {
        $result = $service->submitGuardianReport((int) $user['id'], $_POST, $_FILES['photo'] ?? []);
        clear_old_input();
        flash(
            'success',
            'Report ' . $result['report_code'] . ' was submitted for expert verification. '
            . 'Suggested health: ' . $result['suggested_health'] . '.'
        );
        redirect('reports.php?id=' . $result['id']);
    } catch (InvalidArgumentException $exception) {
        $errors[] = $exception->getMessage();
    } catch (RuntimeException $exception) {
        if ($exception instanceof PDOException) {
            error_log((string) $exception);
            $errors[] = 'The report could not be saved right now. Your photo was not retained. Please try again.';
        } else {
            $errors[] = $exception->getMessage();
        }
    } catch (Throwable $exception) {
        error_log((string) $exception);
        $errors[] = 'The report could not be saved right now. Your photo was not retained. Please try again.';
    }
}

$form = $service->formData($user);
$prefill = ['parent_report_id' => null, 'cluster_id' => null];
$requestedParent = filter_input(INPUT_GET, 'parent', FILTER_VALIDATE_INT);
if ($requestedParent) {
    $parent = $service->reportDetail((int) $requestedParent, $user);
    $availableParentIds = $parent && !empty($parent['cluster_id'])
        ? array_map(
            static fn (array $report): int => (int) $report['id'],
            $service->previousReports((int) $user['id'], (int) $parent['cluster_id'])
        )
        : [];
    if ($parent && $parent['status'] === 'verified' && in_array((int) $parent['id'], $availableParentIds, true)) {
        $prefill = ['parent_report_id' => (int) $parent['id'], 'cluster_id' => (int) $parent['cluster_id']];
    } else {
        $errors[] = 'That report is not available as a follow-up. You can still submit a new observation.';
    }
}

render('submit-report', [
    'pageTitle' => 'Submit a report',
    'user' => $user,
    'criteria' => $form['criteria'],
    'clusters' => $form['clusters'],
    'traits' => $form['traits'],
    'errors' => $errors,
    'prefill' => $prefill,
]);
