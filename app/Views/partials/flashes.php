<?php if ($flashes !== []): ?>
    <div class="flash-stack container-fluid" aria-live="polite" aria-atomic="true">
        <?php foreach ($flashes as $flash): ?>
            <?php
            $type = (string) ($flash['type'] ?? 'info');
            $allowedTypes = ['success', 'danger', 'warning', 'info', 'primary', 'secondary'];
            $type = in_array($type, $allowedTypes, true) ? $type : 'info';
            ?>
            <div class="alert alert-<?= e($type) ?> alert-dismissible fade show shadow-sm" role="alert">
                <i class="bi <?= $type === 'success' ? 'bi-check-circle-fill' : ($type === 'danger' ? 'bi-exclamation-octagon-fill' : 'bi-info-circle-fill') ?> me-2" aria-hidden="true"></i>
                <?= e((string) ($flash['message'] ?? '')) ?>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Dismiss message"></button>
            </div>
        <?php endforeach; ?>
    </div>
<?php endif; ?>
