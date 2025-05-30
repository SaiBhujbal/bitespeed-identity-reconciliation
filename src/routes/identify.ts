import { Router } from 'express';
import { celebrate, Joi, Segments } from 'celebrate';
import { reconcile } from '../services/contactService.js';

export const identifyRouter = Router();

identifyRouter.post(
  '/',
  celebrate({
    [Segments.BODY]: Joi.object({
      email: Joi.string().email().allow(null),
      phoneNumber: Joi.string().pattern(/^[0-9]+$/).allow(null),
    })
      .or('email', 'phoneNumber')
      .required(),
  }),
  async (req, res, next) => {
    try {
      const { email, phoneNumber } = req.body;
      const { primary, emails, phones, secondaryIds } = await reconcile(email, phoneNumber);
      res.json({
        contact: {
          primaryContatctId: primary.id,
          emails,
          phoneNumbers: phones,
          secondaryContactIds: secondaryIds,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
