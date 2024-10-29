import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { Hono } from "hono";
import {sign, verify, decode} from 'hono/jwt'


export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string,
        JWT_SECRET: string
    },
    Variables: {
      user: string,
    }
}>()
  
blogRouter.use("/*", async (c, next)=>{
  try {
    const header = c.req.header("Authorization")?.split(" ")[1]||"";
    const verifyToken = await verify(header, c.env.JWT_SECRET);
    if(!verifyToken){
      c.status(403)
      return c.json({error: "Unauthorized"});
    }
    c.set("user", JSON.stringify(verifyToken));
    await next(); 
  } catch (error) {
    return c.json({message: "Unauthorize access", error})
  }
})
  
blogRouter.post('/create-blog', async (c)=>{
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate())
    
    const body = await c.req.json();
    const author = JSON.parse(c.get("user"));
    const newBlog = await prisma.post.create({
      data: {
        title: body.title,
        content: body.content,
        authorId: author.id //get it from middleware
      }
    })
    c.status(202)
    return c.json({
      message: "blog created",
      newBlog,
    })

    } catch (error) {
      c.status(400)
      return c.json({message: "error while posting blog", error})
    }
})

blogRouter.get('/get-blog/:blogId', async (c)=>{
  try {
      const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL
      }).$extends(withAccelerate())

      const blogId = c.req.param('blogId')
      console.log(blogId)
      const blog = await prisma.post.findUnique({
        where: {
          id: blogId,
        }
      });

      if(!blog){
        return c.json({message: "blog doesn't exist"});
      }

      return c.json({
        message: "blog fetched",
        blog
      })
  } catch (error) {
      c.status(400)
      return c.json({message: "error while getting blog", error})
  }
})

blogRouter.put('/update-blog/:blogId', async (c)=>{
    try {
      const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL
      }).$extends(withAccelerate())
      
      const body = await c.req.json();

      const blogId = c.req.param("blogId");
      const authorId = JSON.parse(c.get('user')).id;

      const updatedBlog = await prisma.post.update({
        where: {
          authorId: authorId,
          id: blogId
        },
        data: {
          title: body.title,
          content: body.content, 
        }
      })

      if(!updatedBlog){
        c.status(400)
        return c.json({message: "failed to update post"})
      }

      return c.json({message: "post updated",updatedBlog});
    } catch (error) {
      return c.json({message: "failed to update blog", error})
    }
})

blogRouter.delete('/delete-blog/:blogId', async (c)=>{
  try {

    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL
      }).$extends(withAccelerate())
    
    const blogId = c.req.param("blogId");
    const authorId = JSON.parse(c.get("user")).id;
    const deletedBlog = await prisma.post.delete({
      where: {
        authorId: authorId,
        id: blogId
      }
    });

    if(!deletedBlog){
      c.status(400)
      return c.json({message: "failed to delete post"})
    }
    return c.json({message: "post has been deleted!"})
  } catch (error) {
    c.status(400);
    return c.json({message: "failed to delete blog post"})
  }
})

blogRouter.get('/get-all-blogs', async (c)=>{
  try {
    const prisma = new PrismaClient({
      datasourceUrl: c.env.DATABASE_URL
      }).$extends(withAccelerate())

    const page = parseInt(c.req.query("page")||"10") || 10;
    const limit = parseInt(c.req.query("limit")||"10") || 10;
    const blogs = await prisma.post.findMany({
      skip: (page-1)*10,
      take: limit,
    })

    if(!blogs){
      return c.json({message: "failed to fetch post"})
    }

    return c.json({message: "all blogs fetched", totalBlogs: blogs.length, blogs});
  } catch (error) {
    return c.json({message: "Failed to fetched posts.", error})
  }  
})
  
