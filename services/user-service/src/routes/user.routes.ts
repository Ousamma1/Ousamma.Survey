import { Router } from 'express';
import { UserController } from '../controllers/user.controller';

const router = Router();
const userController = new UserController();

router.post('/', userController.createProfile.bind(userController));
router.get('/', userController.listProfiles.bind(userController));
router.get('/:userId', userController.getProfile.bind(userController));
router.put('/:userId', userController.updateProfile.bind(userController));
router.delete('/:userId', userController.deleteProfile.bind(userController));

export default router;
