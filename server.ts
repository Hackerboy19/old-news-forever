import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { siteSetting } from "./src/data/siteConfig";
import { translateArticle, translateTitles } from "./src/lib/translate";
import { answerQuestion } from "./src/lib/qa";
import { CIBlog, CICategory, CIAdvertisement, CIActivityLog, CISetting, CISubscriber, CIImageLibrary } from "./src/types";
import {
  getPublishedBlogs,
  getBlogByUrlSlug,
  getAllCategories,
  getActiveAds,
  getActiveTags,
  verifyAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
  bulkBlogAction,
  getAllBlogsAdmin,
  getBlogByIdAdmin,
} from "./src/lib/db";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // In-memory stores for admin demo mutations only (real reads hit MySQL;
  // DB access is strictly read-only — admin writes never touch ci_* tables)
  let dbBlogs: CIBlog[] = [];
  let dbCategories: CICategory[] = [];
  let dbAds: CIAdvertisement[] = [];
  let dbActivityLogs: CIActivityLog[] = [];
  let dbUsers: any[] = [];
  let dbSubscribers: CISubscriber[] = [];
  let dbImages: CIImageLibrary[] = [];
  let dbSetting: CISetting = { ...siteSetting };

  // Helper log activity
  const logActivity = (userName: string, userId: number, activity: string, moduleName: string) => {
    const newLog: CIActivityLog = {
      id: Date.now(),
      user_id: userId,
      user_name: userName,
      activity,
      module: moduleName,
      ip_address: "127.0.0.1",
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    dbActivityLogs.unshift(newLog);
  };

  // --- API ROUTES ---

  // Authenticate write requests against the real ci_admin table
  const requireAdmin = async (req: express.Request) =>
    verifyAdmin(String(req.headers["x-admin-user"] || ""), String(req.headers["x-admin-pass"] || ""));

  // POST /api/admin/login
  app.post("/api/admin/login", async (req, res) => {
    const { username, password } = req.body || {};
    const admin = await verifyAdmin(String(username || ""), String(password || ""));
    if (!admin) return res.status(401).json({ error: "Invalid credentials or database unreachable" });
    res.json(admin);
  });

  // GET /api/translate?slug= — server-side Hindi translation (cached)
  app.get("/api/translate", async (req, res) => {
    const slug = String(req.query.slug || "").trim();
    if (!slug) return res.status(400).json({ error: "slug required" });
    const article = await getBlogByUrlSlug(slug);
    if (!article) return res.status(404).json({ error: "Article not found" });
    res.json(await translateArticle(article));
  });

  // POST /api/translate-titles — batch title translation for feeds
  app.post("/api/translate-titles", async (req, res) => {
    const { titles } = req.body || {};
    if (!Array.isArray(titles) || titles.length === 0) {
      return res.status(400).json({ error: "titles array required" });
    }
    res.json({ translations: await translateTitles(titles.map(String)) });
  });

  // POST /api/ask — interactive article Q&A
  app.post("/api/ask", async (req, res) => {
    const { slug, question } = req.body || {};
    if (!slug || !question || String(question).length > 300) {
      return res.status(400).json({ error: "slug and question (max 300 chars) required" });
    }
    const article = await getBlogByUrlSlug(String(slug).trim());
    if (!article) return res.status(404).json({ error: "Article not found" });
    res.json(await answerQuestion(String(question), article.content, article.short_content));
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", framework: "Express + React Headless CodeIgniter Bridge" });
  });

  // GET /api/blogs — real ci_blog rows, optional ?category_slug= & filters
  app.get("/api/blogs", async (req, res) => {
    try {
      const categorySlug = req.query.category_slug as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200;

      // Admin list (drafts included) — requires valid ci_admin credentials
      if (req.query.status === "all") {
        const admin = await requireAdmin(req);
        if (!admin) return res.status(401).json({ error: "Unauthorized" });
        return res.json(await getAllBlogsAdmin(limit));
      }

      let result = await getPublishedBlogs(limit, categorySlug);

      if (req.query.status !== undefined) {
        const statusNum = parseInt(req.query.status as string, 10);
        result = result.filter(b => b.status === statusNum);
      }
      if (req.query.category_id) {
        const catId = parseInt(req.query.category_id as string, 10);
        result = result.filter(b => b.category_id === catId || b.sub_category_id === catId);
      }
      if (req.query.search) {
        const query = (req.query.search as string).toLowerCase();
        result = result.filter(b =>
          b.title.toLowerCase().includes(query) ||
          b.short_content.toLowerCase().includes(query) ||
          b.url.toLowerCase().includes(query)
        );
      }
      res.json(result);
    } catch (err) {
      console.error("GET /api/blogs failed:", err);
      res.status(500).json({ error: "Failed to load articles" });
    }
  });

  // GET /api/blogs/slug/:url (Dynamic Routing lookup matching exact url column)
  app.get("/api/blogs/slug/:url", async (req, res) => {
    const article = await getBlogByUrlSlug(req.params.url);
    if (!article) {
      return res.status(404).json({ error: "Article not found matching legacy url path" });
    }
    res.json(article);
  });

  // GET /api/blogs/:id — single row, any status
  app.get("/api/blogs/:id", async (req, res) => {
    const blog = await getBlogByIdAdmin(parseInt(req.params.id, 10));
    if (!blog) return res.status(404).json({ error: "Blog not found" });
    res.json(blog);
  });

  // POST /api/blogs — real INSERT into ci_blog (auth required)
  app.post("/api/blogs", async (req, res) => {
    const admin = await requireAdmin(req);
    if (!admin) return res.status(401).json({ error: "Unauthorized" });
    try {
      const created = await createBlog(req.body as Partial<CIBlog>, admin.admin_id);
      logActivity(admin.name, admin.admin_id, `Created Blog Article #${created.id}: "${created.title}"`, "Blog");
      res.status(201).json(created);
    } catch (err: any) {
      console.error("createBlog failed:", err?.message);
      res.status(500).json({ error: "Failed to create article" });
    }
  });

  // PUT /api/blogs/:id — real UPDATE on ci_blog (auth required)
  app.put("/api/blogs/:id", async (req, res) => {
    const admin = await requireAdmin(req);
    if (!admin) return res.status(401).json({ error: "Unauthorized" });
    try {
      const id = parseInt(req.params.id, 10);
      const updated = await updateBlog(id, req.body as Partial<CIBlog>);
      if (!updated) return res.status(404).json({ error: "Blog not found" });
      logActivity(admin.name, admin.admin_id, `Updated Blog Article #${id}: "${updated.title}"`, "Blog");
      res.json(updated);
    } catch (err: any) {
      console.error("updateBlog failed:", err?.message);
      res.status(500).json({ error: "Failed to update article" });
    }
  });

  // DELETE /api/blogs/:id — real DELETE on ci_blog (auth required)
  app.delete("/api/blogs/:id", async (req, res) => {
    const admin = await requireAdmin(req);
    if (!admin) return res.status(401).json({ error: "Unauthorized" });
    const id = parseInt(req.params.id, 10);
    const ok = await deleteBlog(id);
    if (!ok) return res.status(404).json({ error: "Blog not found" });
    logActivity(admin.name, admin.admin_id, `Deleted Blog Article #${id}`, "Blog");
    res.json({ success: true, id });
  });

  // POST /api/blogs/bulk-action — real bulk UPDATE/DELETE (auth required)
  app.post("/api/blogs/bulk-action", async (req, res) => {
    const admin = await requireAdmin(req);
    if (!admin) return res.status(401).json({ error: "Unauthorized" });
    const { ids, action } = req.body as { ids: number[]; action: "activate" | "deactivate" | "delete" };
    if (!Array.isArray(ids) || !["activate", "deactivate", "delete"].includes(action)) {
      return res.status(400).json({ error: "Invalid bulk action payload" });
    }
    const affected = await bulkBlogAction(ids.map(Number), action);
    logActivity(admin.name, admin.admin_id, `Bulk ${action} on ${affected} blogs`, "Blog");
    res.json({ success: true, affected, ids, action });
  });

  // GET /api/categories — all active ci_category rows (parents + children)
  app.get("/api/categories", async (_req, res) => {
    try {
      res.json(await getAllCategories());
    } catch (err) {
      console.error("GET /api/categories failed:", err);
      res.status(500).json({ error: "Failed to load categories" });
    }
  });

  // POST /api/categories
  app.post("/api/categories", (req, res) => {
    const payload = req.body;
    const newId = dbCategories.length ? Math.max(...dbCategories.map(c => c.id)) + 1 : 1;
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    const newCategory: CICategory = {
      id: newId,
      category_name: payload.category_name || "New Category",
      slug: payload.slug || "new-category",
      status: payload.status !== undefined ? payload.status : 1,
      article_count: 0,
      meta_title: payload.meta_title || payload.category_name || "",
      meta_description: payload.meta_description || "",
      created_at: now,
    };

    dbCategories.unshift(newCategory);
    logActivity("Elena Rostova", 1, `Created Category #${newId}: "${newCategory.category_name}"`, "Category");
    res.status(201).json(newCategory);
  });

  // PUT /api/categories/:id
  app.put("/api/categories/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    const idx = dbCategories.findIndex(c => c.id === id);
    if (idx === -1) return res.status(404).json({ error: "Category not found" });

    dbCategories[idx] = { ...dbCategories[idx], ...req.body, id };
    logActivity("Elena Rostova", 1, `Updated Category #${id}: "${dbCategories[idx].category_name}"`, "Category");
    res.json(dbCategories[idx]);
  });

  // DELETE /api/categories/:id
  app.delete("/api/categories/:id", (req, res) => {
    const id = parseInt(req.params.id, 10);
    dbCategories = dbCategories.filter(c => c.id !== id);
    logActivity("Elena Rostova", 1, `Deleted Category #${id}`, "Category");
    res.json({ success: true, id });
  });

  // GET /api/tags — real ci_tag rows
  app.get("/api/tags", async (_req, res) => {
    res.json(await getActiveTags());
  });

  // GET /api/advertisements — real ci_advertisement rows
  app.get("/api/advertisements", async (_req, res) => {
    const realAds = await getActiveAds();
    res.json(realAds.length > 0 ? realAds : dbAds);
  });

  // POST /api/advertisements
  app.post("/api/advertisements", (req, res) => {
    const payload = req.body;
    const newId = dbAds.length ? Math.max(...dbAds.map(a => a.id)) + 1 : 1;
    const now = new Date().toISOString().replace("T", " ").substring(0, 19);

    const newAd: CIAdvertisement = {
      id: newId,
      title: payload.title || "New Ad Banner",
      advertisement_image: payload.advertisement_image || "assets/img/ads/default-728x90.jpg",
      alt_tag: payload.alt_tag || "Advertisement Banner",
      url: payload.url || "https://example.com",
      position: payload.position || "top_banner",
      status: payload.status !== undefined ? payload.status : 1,
      click_count: 0,
      impressions: 100,
      created_at: now,
    };

    dbAds.unshift(newAd);
    logActivity("Elena Rostova", 1, `Created Advertisement #${newId}: "${newAd.title}"`, "Advertisement");
    res.status(201).json(newAd);
  });

  // POST /api/advertisements/:id/click
  app.post("/api/advertisements/:id/click", (req, res) => {
    const id = parseInt(req.params.id, 10);
    const ad = dbAds.find(a => a.id === id);
    if (ad) {
      ad.click_count += 1;
    }
    res.json({ success: true, clicks: ad?.click_count });
  });

  // GET /api/activity-logs
  app.get("/api/activity-logs", (_req, res) => {
    res.json(dbActivityLogs);
  });

  // GET /api/users
  app.get("/api/users", (_req, res) => {
    res.json(dbUsers);
  });

  // GET /api/subscribers
  app.get("/api/subscribers", (_req, res) => {
    res.json(dbSubscribers);
  });

  // POST /api/subscribers
  app.post("/api/subscribers", (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    const existing = dbSubscribers.find(s => s.email === email);
    if (existing) {
      return res.json({ message: "Already subscribed", subscriber: existing });
    }
    const newSub: CISubscriber = {
      id: dbSubscribers.length + 1,
      email,
      status: "subscribed",
      subscribed_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    dbSubscribers.unshift(newSub);
    res.status(201).json({ message: "Subscribed successfully", subscriber: newSub });
  });

  // GET /api/image-library
  app.get("/api/image-library", (_req, res) => {
    res.json(dbImages);
  });

  // POST /api/image-library
  app.post("/api/image-library", (req, res) => {
    const { file_name, file_path, alt_tag } = req.body;
    const newImg: CIImageLibrary = {
      id: dbImages.length ? Math.max(...dbImages.map(i => i.id)) + 1 : 1,
      file_name: file_name || "new-image.jpg",
      file_path: file_path || "assets/img/blog/2026/08/new-image.jpg",
      file_size: "1.5 MB",
      alt_tag: alt_tag || "Uploaded Asset",
      uploaded_by: "elena_rostova",
      created_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    dbImages.unshift(newImg);
    logActivity("Elena Rostova", 1, `Uploaded image asset '${newImg.file_name}'`, "Image Library");
    res.status(201).json(newImg);
  });

  // GET /api/settings
  app.get("/api/settings", (_req, res) => {
    res.json(dbSetting);
  });

  // PUT /api/settings
  app.put("/api/settings", (req, res) => {
    dbSetting = {
      ...dbSetting,
      ...req.body,
      updated_at: new Date().toISOString().replace("T", " ").substring(0, 19),
    };
    logActivity("Elena Rostova", 1, "Updated Site Configuration & SEO Defaults", "Setting");
    res.json(dbSetting);
  });

  // Vite development middleware or production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express Backend + Headless CodeIgniter Bridge Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
