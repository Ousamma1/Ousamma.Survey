import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

// Public routes
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.post('/verify-email', authController.verifyEmail.bind(authController));
router.post('/password-reset/request', authController.requestPasswordReset.bind(authController));
router.post('/password-reset/confirm', authController.resetPassword.bind(authController));
router.post('/verify', authController.verifyToken.bind(authController));

// Protected routes (would require auth middleware in production)
router.post('/change-password', authController.changePassword.bind(authController));

export default router;
