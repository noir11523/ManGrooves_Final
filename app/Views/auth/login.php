<section class="auth-page section-padding">
    <div class="container">
        <div class="auth-card mx-auto">
            <div class="auth-visual auth-visual-login">
                <div class="auth-visual-content">
                    <span class="feature-icon feature-icon-light"><i class="bi bi-tree-fill" aria-hidden="true"></i></span>
                    <p class="eyebrow text-white-50">Welcome back</p>
                    <h1>Continue protecting the coast, one observation at a time.</h1>
                    <p>Your dashboard keeps reports, follow-up reminders, expert feedback, and earned badges together.</p>
                </div>
            </div>
            <div class="auth-form-panel">
                <a class="auth-back-link" href="<?= e(url('index.php')) ?>"><i class="bi bi-arrow-left" aria-hidden="true"></i> Back to home</a>
                <div class="mb-4">
                    <span class="section-kicker">Secure account access</span>
                    <h2>Sign in to ManGROOVES</h2>
                    <p class="text-secondary">Use the email and password linked to your account.</p>
                </div>
                <?php if (($errors ?? []) !== []): ?>
                    <div class="alert alert-danger" role="alert" tabindex="-1" data-error-summary>
                        <h3 class="h6"><i class="bi bi-exclamation-octagon-fill me-2" aria-hidden="true"></i>We could not sign you in</h3>
                        <ul class="mb-0 ps-3"><?php foreach ($errors as $error): ?><li><?= e((string) $error) ?></li><?php endforeach; ?></ul>
                    </div>
                <?php endif; ?>
                <form method="post" action="<?= e(url('login.php')) ?>" class="needs-validation" novalidate>
                    <?= Csrf::field() ?>
                    <div class="form-floating mb-3">
                        <input class="form-control <?= isset($fieldErrors['email']) ? 'is-invalid' : '' ?>" id="email" name="email" type="email" value="<?= e((string) old('email')) ?>" autocomplete="email" placeholder="name@example.com" maxlength="190" autofocus required aria-describedby="emailHelp">
                        <label for="email">Email address</label>
                        <div class="invalid-feedback"><?= e((string) ($fieldErrors['email'] ?? 'Enter a valid email address.')) ?></div>
                    </div>
                    <div class="input-group password-group mb-2">
                        <div class="form-floating">
                            <input class="form-control <?= isset($fieldErrors['password']) ? 'is-invalid' : '' ?>" id="password" name="password" type="password" autocomplete="current-password" placeholder="Password" maxlength="72" required>
                            <label for="password">Password</label>
                        </div>
                        <button class="btn password-toggle" type="button" data-password-toggle="#password" aria-label="Show password"><i class="bi bi-eye" aria-hidden="true"></i></button>
                        <div class="invalid-feedback"><?= e((string) ($fieldErrors['password'] ?? 'Enter your password.')) ?></div>
                    </div>
                    <p class="form-text mb-4">For your security, repeated failed attempts are temporarily limited.</p>
                    <button class="btn btn-primary btn-lg w-100" type="submit" data-submit-label="Signing in…">Sign in</button>
                </form>
                <p class="auth-switch">New to ManGROOVES? <a href="<?= e(url('register.php')) ?>">Create a guardian account</a></p>
            </div>
        </div>
    </div>
</section>
