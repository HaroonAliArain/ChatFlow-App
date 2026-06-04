import uploadToCloudinary from "../utils/uploadToCloudinary.js";

const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    if (!req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: "File buffer is missing",
      });
    }

    const result = await uploadToCloudinary(req.file.buffer, "chat_app", req.file.mimetype);

    return res.status(200).json({
      success: true,
      mediaUrl: result.secure_url,
      mediaType: result.resource_type,
      cloudinary_id: result.public_id,
    });

  } catch (error) {
    console.log("❌ Upload error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Media upload failed",
    });
  }
};

const downloadMedia = async (req, res, next) => {
  try {
    const { url, filename } = req.query;
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL query parameter is required",
      });
    }

    // Use dynamic import for node-fetch or built-in fetch (Node 18+)
    // Follow redirects automatically which http/https.get may not handle well
    const response = await fetch(url, { redirect: "follow" });

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: `Failed to fetch file from remote source (status: ${response.status})`,
      });
    }

    // Set proper headers for file download
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const safeFilename = encodeURIComponent(filename || "download");
    
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);

    // Pipe the response body to the client
    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(Buffer.from(value));
      }
    };

    await pump();

  } catch (error) {
    console.log("❌ Download error:", error.message);
    next(error);
  }
};

const viewMedia = async (req, res, next) => {
  try {
    const { url, filename } = req.query;
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL query parameter is required",
      });
    }

    const response = await fetch(url, { redirect: "follow" });

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: `Failed to fetch file from remote source (status: ${response.status})`,
      });
    }

    // Set proper headers for inline viewing (browser renders the file)
    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const safeFilename = encodeURIComponent(filename || "file");
    
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `inline; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);

    // Pipe the response body to the client
    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          res.end();
          return;
        }
        res.write(Buffer.from(value));
      }
    };

    await pump();

  } catch (error) {
    console.log("❌ View error:", error.message);
    next(error);
  }
};

export default { uploadMedia, downloadMedia, viewMedia };
