<a class="small" href="<?= e(url('admin/verification.php')) ?>">Back to verification</a>
<h1 class="h3 mt-2">Validation history</h1>
<p class="text-body-secondary">See who confirmed, corrected, or rejected a report.</p>
<div class="vstack gap-3">
<?php foreach ($results['items'] as $event): ?>
    <article class="card card-body">
        <div class="d-flex flex-wrap justify-content-between gap-2"><a class="fw-semibold" href="<?= e(url('admin/report.php?id=' . $event['report_id'])) ?>"><?= e($event['report_code']) ?></a><time><?= e(format_datetime($event['created_at'])) ?></time></div>
        <p class="mb-1"><?= e(ucfirst($event['action'])) ?> · <?= e($event['reviewer']) ?> <span class="badge <?= e(report_status_class($event['status'])) ?>"><?= e(ucfirst($event['status'])) ?></span></p>
        <span><?= e($event['health'] ?: 'No confirmed health') ?></span>
        <?php if ($event['comment']): ?><p class="small mb-0 mt-2"><?= nl2br(e($event['comment'])) ?></p><?php endif; ?>
    </article>
<?php endforeach; ?>
<?php if (!$results['items']): ?><p>No decisions yet.</p><?php endif; ?>
</div>
<nav class="d-flex gap-3 justify-content-center my-4" aria-label="History pages">
<?php if ($results['page'] > 1): ?><a href="?page=<?= $results['page'] - 1 ?>">Previous</a><?php endif; ?>
<span>Page <?= $results['page'] ?> of <?= $results['pages'] ?></span>
<?php if ($results['page'] < $results['pages']): ?><a href="?page=<?= $results['page'] + 1 ?>">Next</a><?php endif; ?>
</nav>
