import { Request, Response, NextFunction } from 'express';
import { ResponseAfterSuccessfulAuth, User} from '../../models';
import { ErrorAuthFailed, ErrorAuthInactiveAccount } from '../../utils';

export class AuthHelperController { 
  public static async httpPostAuth(
    req: Request & {user?: User},
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {

      if (!req.user) {
        next(new ErrorAuthFailed());
        return;
      }
  
      const response: ResponseAfterSuccessfulAuth = {
        id: req.user.id,
        username: req.user.username,
      };
  
      res.send(response);
      return;
    }
    catch (err) {
      next(err);
    }
  }

  public static async localAuthFailure(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {

    if (req.flash('error')[0] === 'inactive') {
      next(new ErrorAuthInactiveAccount());
      return;
    }
  
    next(new ErrorAuthFailed());
    return;
  }
  
}