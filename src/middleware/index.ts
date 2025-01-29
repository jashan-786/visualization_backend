import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

const autheticateMiddlware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization?.split(" ")[1];
  console.log(token);

  if (!token) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, "2131d") as JwtPayload;
    if (decoded == null) {
      res.status(401).json({ message: "unauthorized" });
      return;
    }

    req.body.userId = decoded.userId as JwtPayload;

    next();
  } catch (error) {
    res.status(401).json({ message: "unauthorized" });
    return;
  }
};

export default autheticateMiddlware;
