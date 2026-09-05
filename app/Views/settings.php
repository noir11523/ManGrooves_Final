<div class="page-intro d-lg-none">
    <p class="eyebrow">Your account</p>
    <h1>Settings</h1>
    <p>Keep your contact details current and your account secure.</p>
</div>

<div class="row g-4 settings-grid">
    <div class="col-xl-8">
        <section class="content-card" aria-labelledby="profile-heading">
            <div class="card-heading">
                <div><span class="card-heading-icon"><i class="bi bi-person-lines-fill" aria-hidden="true"></i></span></div>
                <div><h2 id="profile-heading">Profile information</h2><p>These details identify your field reports and help the conservation team contact you when needed.</p></div>
            </div>
            <?php if (($profileErrors ?? []) !== []): ?>
                <div class="alert alert-danger" role="alert" tabindex="-1" data-error-summary>
                    <h3 class="h6">Please correct the following</h3>
                    <ul class="mb-0 ps-3"><?php foreach ($profileErrors as $error): ?><li><?= e((string) $error) ?></li><?php endforeach; ?></ul>
                </div>
            <?php endif; ?>
            <form method="post" action="<?= e(url('settings.php')) ?>" class="needs-validation" novalidate>
                <?= Csrf::field() ?>
                <input type="hidden" name="action" value="profile">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label" for="settings-full-name">Full name</label>
                        <input class="form-control" id="settings-full-name" name="full_name" type="text" value="<?= e((string) $profileValues['full_name']) ?>" autocomplete="name" minlength="2" maxlength="120" required>
                        <div class="invalid-feedback">Enter a full name between 2 and 120 characters.</div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="settings-email">Email address</label>
                        <input class="form-control" id="settings-email" name="email" type="email" value="<?= e((string) $profileValues['email']) ?>" autocomplete="email" maxlength="190" required>
                        <div class="invalid-feedback">Enter a valid email address.</div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="settings-phone">Phone <span class="text-secondary">(optional)</span></label>
                        <input class="form-control" id="settings-phone" name="phone" type="tel" value="<?= e((string) $profileValues['phone']) ?>" autocomplete="tel" maxlength="30" pattern="[0-9+() .-]{7,30}">
                        <div class="invalid-feedback">Enter a valid phone number or leave it blank.</div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="settings-barangay">Barangay<?= $user['role'] === 'guardian' ? '' : ' (optional)' ?></label>
                        <select class="form-select" id="settings-barangay" name="barangay_id" <?= $user['role'] === 'guardian' ? 'required' : '' ?>>
                            <option value=""><?= $user['role'] === 'guardian' ? 'Choose your barangay…' : 'No barangay assigned' ?></option>
                            <?php foreach ($barangays as $barangay): ?>
                                <option value="<?= e((string) $barangay['id']) ?>" <?= (string) $profileValues['barangay_id'] === (string) $barangay['id'] ? 'selected' : '' ?>><?= e((string) $barangay['name']) ?>, <?= e((string) $barangay['city_municipality']) ?></option>
                            <?php endforeach; ?>
                        </select>
                        <div class="invalid-feedback">Select your barangay.</div>
                    </div>
                    <div class="col-12 pt-2">
                        <button class="btn btn-primary" type="submit" data-submit-label="Saving profile…"><i class="bi bi-check2 me-1" aria-hidden="true"></i> Save profile</button>
                    </div>
                </div>
            </form>
        </section>

        <section class="content-card mt-4" aria-labelledby="password-heading">
            <div class="card-heading">
                <div><span class="card-heading-icon"><i class="bi bi-key-fill" aria-hidden="true"></i></span></div>
                <div><h2 id="password-heading">Change password</h2><p>Confirm your current password before choosing a new one.</p></div>
            </div>
            <?php if (($passwordErrors ?? []) !== []): ?>
                <div class="alert alert-danger" role="alert" tabindex="-1" data-error-summary>
                    <h3 class="h6">Your password was not changed</h3>
                    <ul class="mb-0 ps-3"><?php foreach ($passwordErrors as $error): ?><li><?= e((string) $error) ?></li><?php endforeach; ?></ul>
                </div>
            <?php endif; ?>
            <form method="post" action="<?= e(url('settings.php#password-heading')) ?>" class="needs-validation" novalidate>
                <?= Csrf::field() ?>
                <input type="hidden" name="action" value="password">
                <div class="row g-3">
                    <div class="col-12">
                        <label class="form-label" for="current-password">Current password</label>
                        <div class="input-group password-group">
                            <input class="form-control" id="current-password" name="current_password" type="password" autocomplete="current-password" required>
                            <button class="btn password-toggle" type="button" data-password-toggle="#current-password" aria-label="Show current password"><i class="bi bi-eye" aria-hidden="true"></i></button>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="new-password">New password</label>
                        <div class="input-group password-group">
                            <input class="form-control" id="new-password" name="new_password" type="password" autocomplete="new-password" minlength="8" maxlength="72" required data-password-strength>
                            <button class="btn password-toggle" type="button" data-password-toggle="#new-password" aria-label="Show new password"><i class="bi bi-eye" aria-hidden="true"></i></button>
                        </div>
                        <div class="password-meter mt-2" aria-hidden="true"><span data-password-meter></span></div>
                        <div class="form-text" data-password-hint>Use 8 to 72 characters; a few unrelated words work well.</div>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label" for="new-password-confirmation">Confirm new password</label>
                        <input class="form-control" id="new-password-confirmation" name="new_password_confirmation" type="password" autocomplete="new-password" minlength="8" maxlength="72" required data-password-confirm="#new-password">
                        <div class="invalid-feedback">Enter the same new password again.</div>
                    </div>
                    <div class="col-12 pt-2">
                        <button class="btn btn-outline-primary" type="submit" data-submit-label="Updating password…"><i class="bi bi-shield-lock me-1" aria-hidden="true"></i> Update password</button>
                    </div>
                </div>
            </form>
        </section>
    </div>

    <div class="col-xl-4">
        <aside class="content-card account-summary" aria-labelledby="account-summary-heading">
            <span class="user-avatar user-avatar-lg" aria-hidden="true"><?= e(mb_strtoupper(mb_substr((string) $user['full_name'], 0, 1))) ?></span>
            <h2 id="account-summary-heading"><?= e((string) $user['full_name']) ?></h2>
            <p><?= e(match ((string) $user['role']) { 'expert' => 'CCENRO Expert', 'system_admin' => 'System Administrator', default => 'Mangrove Guardian' }) ?></p>
            <dl class="account-details">
                <div><dt>Account status</dt><dd><span class="status-pill status-active"><i class="bi bi-check-circle-fill" aria-hidden="true"></i> Active</span></dd></div>
                <div><dt>Member since</dt><dd><?= e(format_datetime((string) $user['created_at'], 'M j, Y')) ?></dd></div>
                <div><dt>Last sign-in</dt><dd><?= e(format_datetime($user['last_login_at'] ?? null)) ?></dd></div>
            </dl>
            <div class="account-security-note"><i class="bi bi-shield-check" aria-hidden="true"></i><p><strong>Your data is protected.</strong><br>Passwords are securely hashed and never displayed or sent back to your browser.</p></div>
        </aside>
    </div>
</div>
