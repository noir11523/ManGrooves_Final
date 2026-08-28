<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
    <div><h1 class="h3 mb-1">User management</h1><p class="text-muted mb-0">Control roles and access without erasing conservation or verification history.</p></div>
    <a class="btn btn-outline-secondary" href="<?= e(url('admin/audit.php')) ?>">View audit log</a>
</div>

<form class="card card-body mb-4" method="get" action="<?= e(url('admin/users.php')) ?>">
    <div class="row g-3 align-items-end">
        <div class="col-md-4"><label class="form-label" for="user-q">Search</label><input class="form-control" id="user-q" name="q" value="<?= e($search) ?>" placeholder="Name, email, or phone"></div>
        <div class="col-sm-4 col-md-2"><label class="form-label" for="user-role">Role</label><select class="form-select" id="user-role" name="role"><option value="">All roles</option><?php foreach ($roles as $role): ?><option value="<?= e($role) ?>" <?= $roleFilter === $role ? 'selected' : '' ?>><?= e(ucwords(str_replace('_', ' ', $role))) ?></option><?php endforeach; ?></select></div>
        <div class="col-sm-4 col-md-2"><label class="form-label" for="user-status">Status</label><select class="form-select" id="user-status" name="status"><option value="">All statuses</option><?php foreach ($statuses as $status): ?><option value="<?= e($status) ?>" <?= $statusFilter === $status ? 'selected' : '' ?>><?= e(ucfirst($status)) ?></option><?php endforeach; ?></select></div>
        <div class="col-sm-4 col-md-2"><label class="form-label" for="user-barangay">Barangay</label><select class="form-select" id="user-barangay" name="barangay_id"><option value="">All</option><?php foreach ($barangays as $barangay): ?><option value="<?= (int) $barangay['id'] ?>" <?= (int) $barangayFilter === (int) $barangay['id'] ? 'selected' : '' ?>><?= e($barangay['name']) ?></option><?php endforeach; ?></select></div>
        <div class="col-md-2 d-flex gap-2"><button class="btn btn-success" type="submit">Filter</button><a class="btn btn-outline-secondary" href="<?= e(url('admin/users.php')) ?>">Reset</a></div>
    </div>
</form>

<div class="card"><div class="card-header"><?= number_format($total) ?> user<?= $total === 1 ? '' : 's' ?></div><div class="table-responsive"><table class="table table-hover align-middle mb-0">
    <thead><tr><th>User</th><th>Contact / barangay</th><th>Activity</th><th>Role and status</th><th class="text-end">Actions</th></tr></thead>
    <tbody>
    <?php foreach ($users as $managedUser): ?>
        <?php $isSelf = (int) $managedUser['id'] === (int) $currentUser['id']; ?>
        <tr>
            <td><strong><?= e($managedUser['full_name']) ?></strong><?php if ($isSelf): ?> <span class="badge text-bg-info">You</span><?php endif; ?><div class="small text-muted">Joined <?= e(format_datetime($managedUser['created_at'], 'M j, Y')) ?></div></td>
            <td><?= e($managedUser['email']) ?><div class="small text-muted"><?= e($managedUser['phone'] ?: 'No phone') ?> · <?= e($managedUser['barangay_name'] ?: 'No barangay') ?></div></td>
            <td><?= number_format((int) $managedUser['report_count']) ?> reports<div class="small text-muted">Last login: <?= e(format_datetime($managedUser['last_login_at'])) ?></div></td>
            <td>
                <form class="d-flex flex-wrap gap-2 align-items-center" method="post" action="<?= e(url('admin/users.php')) ?>">
                    <?= Csrf::field() ?><input type="hidden" name="action" value="update"><input type="hidden" name="user_id" value="<?= (int) $managedUser['id'] ?>">
                    <select class="form-select form-select-sm" style="width:auto" name="role" aria-label="Role" <?= $isSelf ? 'disabled' : '' ?>><?php foreach ($roles as $role): ?><option value="<?= e($role) ?>" <?= $managedUser['role'] === $role ? 'selected' : '' ?>><?= e(ucwords(str_replace('_', ' ', $role))) ?></option><?php endforeach; ?></select>
                    <select class="form-select form-select-sm" style="width:auto" name="status" aria-label="Status" <?= $isSelf ? 'disabled' : '' ?>><?php foreach ($statuses as $status): ?><option value="<?= e($status) ?>" <?= $managedUser['status'] === $status ? 'selected' : '' ?>><?= e(ucfirst($status)) ?></option><?php endforeach; ?></select>
                    <?php if (!$isSelf): ?><button class="btn btn-sm btn-success" type="submit">Save</button><?php endif; ?>
                </form>
            </td>
            <td class="text-end">
                <?php if (!$isSelf): ?><form class="d-inline js-confirm-form" data-confirm="Delete this unused account? This cannot be undone." method="post" action="<?= e(url('admin/users.php')) ?>"><?= Csrf::field() ?><input type="hidden" name="action" value="delete"><input type="hidden" name="user_id" value="<?= (int) $managedUser['id'] ?>"><button class="btn btn-sm btn-outline-danger" type="submit">Delete</button></form><?php else: ?><span class="small text-muted">Protected</span><?php endif; ?>
            </td>
        </tr>
    <?php endforeach; ?>
    <?php if ($users === []): ?><tr><td colspan="5" class="text-center text-muted py-5">No users match these filters.</td></tr><?php endif; ?>
    </tbody>
</table></div></div>

<?php if ($totalPages > 1): ?><nav class="mt-4"><ul class="pagination justify-content-center"><li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>"><a class="page-link" href="?<?= e(query_string(['page' => max(1, $page - 1)])) ?>">Previous</a></li><li class="page-item disabled"><span class="page-link">Page <?= $page ?> of <?= $totalPages ?></span></li><li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>"><a class="page-link" href="?<?= e(query_string(['page' => min($totalPages, $page + 1)])) ?>">Next</a></li></ul></nav><?php endif; ?>
<script src="<?= e(asset('js/admin.js')) ?>" defer></script>
