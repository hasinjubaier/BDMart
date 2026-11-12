import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { TokenPayload } from "../services/token.service.js";

export const CurrentUser = createParamDecorator(
  (data: keyof TokenPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as TokenPayload | undefined;

    return data && user ? user[data] : user;
  },
);
