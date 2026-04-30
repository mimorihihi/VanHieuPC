import { NextRequest, NextResponse } from "next/server"
import { UploadApiResponse } from "cloudinary"
import { cloudinary } from "@/lib/cloudinary"

export const runtime = "nodejs"

// Max file size: 5MB
const MAX_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"]

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) return error.message
  return "Upload failed"
}

function normalizeFolder(rawFolder: string | null) {
  if (!rawFolder) return "datn-ecomm/images"
  return rawFolder
    .trim()
    .replace(/[^a-zA-Z0-9/_-]/g, "")
    .replace(/^\/+|\/+$/g, "") || "datn-ecomm/images"
}

function uploadBufferToCloudinary(fileBuffer: Buffer, folder: string) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"))
          return
        }
        resolve(result)
      }
    )

    stream.end(fileBuffer)
  })
}

export async function POST(req: NextRequest) {
  try {
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return NextResponse.json(
        {
          error:
            "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env",
        },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const folder = normalizeFolder(formData.get("folder")?.toString() ?? null)

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: JPG, PNG, GIF, WebP, SVG` },
        { status: 400 },
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploaded = await uploadBufferToCloudinary(buffer, folder)

    return NextResponse.json({
      url: uploaded.secure_url,
      public_id: uploaded.public_id,
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes,
      format: uploaded.format,
      folder,
    })
  } catch (error: unknown) {
    const message = getErrorMessage(error)
    console.error("Upload error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
