<div class="modal fade auth-modal" id="authModal" tabindex="-1" aria-labelledby="authModalTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-lg modal-dialog-scrollable">
        <div class="modal-content">
            <button type="button" class="btn-close modal-close" data-bs-dismiss="modal" aria-label="Close"></button>
            <div class="auth-modal-aside d-none d-md-flex">
                <div>
                    <span class="feature-icon feature-icon-light"><i class="bi bi-tree-fill" aria-hidden="true"></i></span>
                    <h2>Join a growing community for healthier coasts.</h2>
                    <p>Document local mangroves, receive expert guidance, and track your conservation impact.</p>
                </div>
            </div>
            <div class="auth-modal-main">
                <ul class="nav nav-pills auth-tabs" role="tablist" aria-label="Account options">
                    <li class="nav-item" role="presentation"><button class="nav-link active" id="modal-login-tab" data-bs-toggle="pill" data-bs-target="#modal-login" type="button" role="tab" aria-controls="modal-login" aria-selected="true">Sign in</button></li>
                    <li class="nav-item" role="presentation"><button class="nav-link" id="modal-register-tab" data-bs-toggle="pill" data-bs-target="#modal-register" type="button" role="tab" aria-controls="modal-register" aria-selected="false">Register</button></li>
                </ul>
                <div class="tab-content pt-4">
                    <div class="tab-pane fade show active" id="modal-login" role="tabpanel" aria-labelledby="modal-login-tab" tabindex="0">
                        <div class="mb-4"><h2 class="h3" id="authModalTitle">Welcome back</h2><p class="text-secondary mb-0">Sign in to continue your conservation work.</p></div>
                        <form method="post" action="<?= e(url('login.php')) ?>" class="needs-validation" novalidate>
                            <?= Csrf::field() ?>
                            <div class="form-floating mb-3">
                                <input class="form-control" id="modal-email" name="email" type="email" autocomplete="email" placeholder="name@example.com" maxlength="190" required>
                                <label for="modal-email">Email address</label>
                                <div class="invalid-feedback">Enter a valid email address.</div>
                            </div>
                            <div class="input-group password-group mb-3">
                                <div class="form-floating">
                                    <input class="form-control" id="modal-password" name="password" type="password" autocomplete="current-password" placeholder="Password" maxlength="72" required>
                                    <label for="modal-password">Password</label>
                                </div>
                                <button class="btn password-toggle" type="button" data-password-toggle="#modal-password" aria-label="Show password"><i class="bi bi-eye" aria-hidden="true"></i></button>
                            </div>
                            <button class="btn btn-primary btn-lg w-100" type="submit" data-submit-label="Signing in…">Sign in</button>
                        </form>
                    </div>
                    <div class="tab-pane fade" id="modal-register" role="tabpanel" aria-labelledby="modal-register-tab" tabindex="0">
                        <div class="mb-4"><h2 class="h3">Become a guardian</h2><p class="text-secondary mb-0">Create your community monitoring account.</p></div>
                        <form method="post" action="<?= e(url('register.php')) ?>" class="needs-validation" novalidate>
                            <?= Csrf::field() ?>
                            <div class="row g-3">
                                <div class="col-12"><label class="form-label" for="modal-full-name">Full name</label><input class="form-control" id="modal-full-name" name="full_name" type="text" autocomplete="name" minlength="2" maxlength="120" required></div>
                                <div class="col-12"><label class="form-label" for="modal-register-email">Email address</label><input class="form-control" id="modal-register-email" name="email" type="email" autocomplete="email" maxlength="190" required></div>
                                <div class="col-sm-6"><label class="form-label" for="modal-phone">Phone <span class="text-secondary">(optional)</span></label><input class="form-control" id="modal-phone" name="phone" type="tel" autocomplete="tel" maxlength="30"></div>
                                <div class="col-sm-6"><label class="form-label" for="modal-barangay">Barangay</label><select class="form-select" id="modal-barangay" name="barangay_id" required><option value="">Choose…</option><?php foreach (($barangays ?? []) as $barangay): ?><option value="<?= e((string) $barangay['id']) ?>"><?= e((string) $barangay['name']) ?></option><?php endforeach; ?></select></div>
                                <div class="col-sm-6"><label class="form-label" for="modal-new-password">Password</label><input class="form-control" id="modal-new-password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required data-password-strength><div class="form-text">Use 8 to 72 characters.</div></div>
                                <div class="col-sm-6"><label class="form-label" for="modal-confirm-password">Confirm password</label><input class="form-control" id="modal-confirm-password" name="password_confirmation" type="password" autocomplete="new-password" minlength="8" maxlength="72" required data-password-confirm="#modal-new-password"></div>
                                <div class="col-12"><div class="form-check"><input class="form-check-input" id="modal-privacy" name="privacy_consent" type="checkbox" value="1" required><label class="form-check-label" for="modal-privacy">I have read the <a href="<?= e(url('privacy.php')) ?>" target="_blank" rel="noopener">privacy notice</a> and consent to the described use of my account and field-report data.</label></div></div>
                                <div class="col-12"><button class="btn btn-primary btn-lg w-100" type="submit" data-submit-label="Creating account…">Create guardian account</button></div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
