<dialog class="privacy-dialog" id="privacyNotice" aria-labelledby="privacy-notice-title">
    <div class="privacy-dialog-header">
        <h2 class="h4 mb-0" id="privacy-notice-title">Privacy notice</h2>
        <button class="btn-close" type="button" data-close-privacy aria-label="Close privacy notice" autofocus></button>
    </div>
    <div class="privacy-dialog-body" tabindex="0" aria-label="Privacy notice text">
        <p>ManGROOVES collects only the information needed to coordinate community mangrove monitoring, verify field evidence, and support conservation decisions.</p>
        <?php require APP_ROOT . '/app/Views/partials/privacy-content.php'; ?>
    </div>
    <div class="privacy-dialog-footer">
        <button class="btn btn-primary" type="button" data-close-privacy>OK</button>
    </div>
</dialog>
