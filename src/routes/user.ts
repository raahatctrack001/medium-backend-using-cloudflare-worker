
import { PrismaClient } from '@prisma/client/edge'
import { withAccelerate } from '@prisma/extension-accelerate'

import { Hono } from "hono";
import { sign } from 'hono/jwt'

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string,
    JWT_SECRET: string,
  }
}>()
userRouter.post('/signup', async (c)=>{
  try {      
      const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
      }).$extends(withAccelerate())
    
      const body = await c.req.json();
      const newUser = await prisma.user.create({
        data: {
          name: body.name,
          email: body.email,
          password: body.password,
        }
      })
    
      if(!newUser){
        return c.json({message: "failed to create user!"})
      }
    
      const token = await sign(
        {name: newUser.name, email: newUser.email}, 
        c.env.JWT_SECRET
      )
    
      return c.json({newUser, token});
    } catch (error) {
        c.status(400)
        return c.json({message: "error registering user!", error})
    }  
  })
  
  
userRouter.post('/signin', async (c)=>{
    try {
      const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
      }).$extends(withAccelerate())
    
      const body = await c.req.json();
      const currentUser = await prisma.user.findUnique({
        where: {
          email: body.email,
          password: body.password,
        }
      })
    
      if(!currentUser){
        return c.json({error: "Wrong credentials!"})
      }
    
      const token = await sign(
        {id: currentUser.id, name: currentUser.name, email: currentUser.email}, 
        c.env.JWT_SECRET
      )
      return c.json({
        message: "user signed in",
        user: currentUser,
        token
      })
    } catch (error) {
      c.status(400)
      return c.json({message: "error while signing in", error})
    }
  })
  
 
