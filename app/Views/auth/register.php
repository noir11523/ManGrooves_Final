<section class="auth-page section-padding">
    <div class="container">
        <div class="auth-card auth-card-wide mx-auto">
            <div class="auth-visual auth-visual-register">
                <div class="auth-visual-content">
                    <span class="feature-icon feature-icon-light"><i class="bi bi-binoculars-fill" aria-hidden="true"></i></span>
                    <p class="eyebrow text-white-50">Community guardians</p>
                    <h1>Your local knowledge can guide meaningful action.</h1>
                    <ul class="auth-benefits">
                        <li><i class="bi bi-check2-circle" aria-hidden="true"></i> Guided visual health checks</li>
                        <li><i class="bi bi-check2-circle" aria-hidden="true"></i> Feedback from CCENRO experts</li>
                        <li><i class="bi bi-check2-circle" aria-hidden="true"></i> Progress tracking and recognition badges</li>
                    </ul>
                </div>
            </div>
            <div class="auth-form-panel">
                <a class="auth-back-link" href="<?= e(url('index.php')) ?>"><i class="bi bi-arrow-left" aria-hidden="true"></i> Back to home</a>
                <div class="mb-4">
                    <span class="section-kicker">Join the monitoring network</span>
                    <h2>Create a guardian account</h2>
                    <p class="text-secondary">All fields are required unless marked optional.</p>
                </div>
                <?php if (($errors ?? []) !== []): ?>
                    <div class="alert alert-danger" role="alert" tabindex="-1" data-error-summary>
                        <h3 class="h6"><i class="bi bi-exclamation-octagon-fill me-2" aria-hidden="true"></i>Please check your information</h3>
                        <ul class="mb-0 ps-3"><?php foreach ($errors as $error): ?><li><?= e((string) $error) ?></li><?php endforeach; ?></ul>
                    </div>
                <?php endif; ?>
                <form method="post" action="<?= e(url('register.php')) ?>" class="needs-validation" novalidate>
                    <?= Csrf::field() ?>
                    <div class="row g-3">
                        <div class="col-12">
                            <label class="form-label" for="full_name">Full name</label>
                            <input class="form-control" id="full_name" name="full_name" type="text" value="<?= e((string) old('full_name')) ?>" autocomplete="name" minlength="2" maxlength="120" autofocus required>
                            <div class="invalid-feedback">Enter your full name.</div>
                        </div>
                        <div class="col-12">
                            <label class="form-label" for="register_email">Email address</label>
                            <input class="form-control" id="register_email" name="email" type="email" value="<?= e((string) old('email')) ?>" autocomplete="email" maxlength="190" required>
                            <div class="invalid-feedback">Enter a valid email address.</div>
                        </div>
                        <div class="col-sm-6">
                            <label class="form-label" for="phone">Phone <span class="text-secondary">(optional)</span></label>
                            <input class="form-control" id="phone" name="phone" type="tel" value="<?= e((string) old('phone')) ?>" autocomplete="tel" maxlength="30" pattern="[0-9+() .-]{7,30}">
                            <div class="invalid-feedback">Use a valid phone number.</div>
                        </div>
                        <div class="col-sm-6">
                            <label class="form-label" for="barangay_id">Barangay</label>
                            <select class="form-select" id="barangay_id" name="barangay_id" required>
                                <option value="">Choose your barangay…</option>
                                <?php foreach (($barangays ?? []) as $barangay): ?>
                                    <option value="<?= e((string) $barangay['id']) ?>" <?= (string) old('barangay_id') === (string) $barangay['id'] ? 'selected' : '' ?>><?= e((string) $barangay['name']) ?>, <?= e((string) $barangay['city_municipality']) ?></option>
                                <?php endforeach; ?>
                            </select>
                            <div class="invalid-feedback">Select your barangay.</div>
                        </div>
                        <div class="col-sm-6">
                            <label class="form-label" for="register_password">Password</label>
                            <div class="input-group password-group">
                                <input class="form-control" id="register_password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required data-password-strength>
                                <button class="btn password-toggle" type="button" data-password-toggle="#register_password" aria-label="Show password"><i class="bi bi-eye" aria-hidden="true"></i></button>
                            </div>
                            <div class="password-meter mt-2" aria-hidden="true"><span data-password-meter></span></div>
                            <div class="form-text" data-password-hint>Use 8 to 72 characters; a few words are easier to remember.</div>
                        </div>
                        <div class="col-sm-6">
                            <label class="form-label" for="password_confirmation">Confirm password</label>
                            <input class="form-control" id="password_confirmation" name="password_confirmation" type="password" autocomplete="new-password" minlength="8" maxlength="72" required data-password-confirm="#register_password">
                            <div class="invalid-feedback">Enter the same password again.</div>
                        </div>
                        <div class="col-12">
                            <div class="privacy-consent">
                                <div class="form-check">
                                    <input class="form-check-input" id="privacy_consent" name="privacy_consent" type="checkbox" value="1" <?= old('privacy_consent') ? 'checked' : '' ?> required>
                                    <label class="form-check-label" for="privacy_consent">I have read the <a href="<?= e(url('privacy.php')) ?>" target="_blank" rel="noopener">privacy notice</a> and consent to the described collection and use of my account details, location, and field observations.</label>
                                    <div class="invalid-feedback">Consent is required to create an account.</div>
                                </div>
                            </div>
                        </div>
                        <div class="col-12"><button class="btn btn-primary btn-lg w-100" type="submit" data-submit-label="Creating account…">Create guardian account</button></div>
                    </div>
                </form>
                <p class="auth-switch">Already have an account? <a href="<?= e(url('login.php')) ?>">Sign in</a></p>
            </div>
        </div>
    </div>
</section>
