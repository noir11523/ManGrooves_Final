<div class="mb-4"><h1 class="h3 mb-1">Audit log</h1><p class="text-muted mb-0">Trace security-sensitive and administrative actions. Audit records are read-only.</p></div>

<form class="card card-body mb-4" method="get" action="<?= e(url('admin/audit.php')) ?>"><div class="row g-3 align-items-end">
    <div class="col-md-4"><label class="form-label" for="audit-q">Search</label><input class="form-control" id="audit-q" name="q" value="<?= e($search) ?>" placeholder="Action, actor, entity ID, details"></div>
    <div class="col-md-2"><label class="form-label" for="audit-action">Action</label><select class="form-select" id="audit-action" name="action"><option value="">All actions</option><?php foreach ($actions as $action): ?><option value="<?= e($action) ?>" <?= $actionFilter === $action ? 'selected' : '' ?>><?= e($action) ?></option><?php endforeach; ?></select></div>
    <div class="col-md-2"><label class="form-label" for="audit-entity">Entity</label><select class="form-select" id="audit-entity" name="entity_type"><option value="">All entities</option><?php foreach ($entities as $entity): ?><option value="<?= e($entity) ?>" <?= $entityFilter === $entity ? 'selected' : '' ?>><?= e($entity) ?></option><?php endforeach; ?></select></div>
    <div class="col-md-4"><label class="form-label" for="audit-user">Actor</label><select class="form-select" id="audit-user" name="user_id"><option value="">All actors</option><?php foreach ($actors as $actor): ?><option value="<?= (int) $actor['id'] ?>" <?= (int) $userFilter === (int) $actor['id'] ? 'selected' : '' ?>><?= e($actor['full_name']) ?> — <?= e($actor['email']) ?></option><?php endforeach; ?></select></div>
    <div class="col-sm-4 col-md-2"><label class="form-label" for="audit-from">From</label><input class="form-control" type="date" id="audit-from" name="date_from" value="<?= e($dateFrom) ?>"></div>
    <div class="col-sm-4 col-md-2"><label class="form-label" for="audit-to">To</label><input class="form-control" type="date" id="audit-to" name="date_to" value="<?= e($dateTo) ?>"></div>
    <div class="col-sm-4 d-flex gap-2"><button class="btn btn-success" type="submit">Filter</button><a class="btn btn-outline-secondary" href="<?= e(url('admin/audit.php')) ?>">Reset</a></div>
</div></form>

<div class="card"><div class="card-header"><?= number_format($total) ?> event<?= $total === 1 ? '' : 's' ?></div><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Context</th><th>Origin</th></tr></thead><tbody>
<?php foreach ($logs as $log): ?>
    <?php
    $details = null;
    if ($log['details_json']) {
        $decoded = json_decode((string) $log['details_json'], true);
        $details = is_array($decoded) ? json_encode($decoded, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : (string) $log['details_json'];
    }
    ?>
    <tr><td class="text-nowrap"><?= e(format_datetime($log['created_at'])) ?></td><td><?= e($log['user_name'] ?: 'System / deleted user') ?><div class="small text-muted"><?= e($log['user_email'] ?: '') ?></div></td><td><code><?= e($log['action']) ?></code></td><td><?= e($log['entity_type'] ?: '—') ?><?= $log['entity_id'] !== null ? ' #' . e($log['entity_id']) : '' ?></td><td><?php if ($details): ?><details><summary class="small">View details</summary><pre class="small mb-0 mt-2 text-wrap" style="max-width:34rem"><?= e($details) ?></pre></details><?php else: ?>—<?php endif; ?></td><td><span class="small"><?= e($log['ip_address']) ?></span><div class="small text-muted text-truncate" style="max-width:18rem" title="<?= e($log['user_agent']) ?>"><?= e($log['user_agent']) ?></div></td></tr>
<?php endforeach; ?>
<?php if ($logs === []): ?><tr><td colspan="6" class="text-center text-muted py-5">No audit events match these filters.</td></tr><?php endif; ?>
</tbody></table></div></div>

<?php if ($totalPages > 1): ?><nav class="mt-4"><ul class="pagination justify-content-center"><li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>"><a class="page-link" href="?<?= e(query_string(['page' => max(1, $page - 1)])) ?>">Previous</a></li><li class="page-item disabled"><span class="page-link">Page <?= $page ?> of <?= $totalPages ?></span></li><li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>"><a class="page-link" href="?<?= e(query_string(['page' => min($totalPages, $page + 1)])) ?>">Next</a></li></ul></nav><?php endif; ?>
