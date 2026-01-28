import { prisma } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import type { Brand } from '@prisma/client';

// ============================================
// SERVICE: BRANDS (Marques pour fiches techniques)
// ============================================

export interface CreateBrandInput {
  name: string;
  description?: string;
  logoUrl?: string;
  folderUrl?: string;
  websiteUrl?: string;
  order?: number;
  isActive?: boolean;
}

export interface UpdateBrandInput extends Partial<CreateBrandInput> {}

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Get all brands (active only for clients, all for admin)
 */
export async function getAllBrands(includeInactive = false): Promise<Brand[]> {
  const where = includeInactive ? {} : { isActive: true };

  return prisma.brand.findMany({
    where,
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Get a brand by ID
 */
export async function getBrandById(id: string): Promise<Brand | null> {
  return prisma.brand.findUnique({
    where: { id },
  });
}

/**
 * Get a brand by slug
 */
export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  return prisma.brand.findUnique({
    where: { slug },
  });
}

/**
 * Create a new brand
 */
export async function createBrand(data: CreateBrandInput): Promise<Brand> {
  // Check if name already exists
  const existing = await prisma.brand.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    throw AppError.conflict(`La marque "${data.name}" existe déjà`);
  }

  // Generate slug
  let slug = generateSlug(data.name);

  // Ensure slug is unique
  const existingSlug = await prisma.brand.findUnique({
    where: { slug },
  });

  if (existingSlug) {
    slug = `${slug}-${Date.now()}`;
  }

  return prisma.brand.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      logoUrl: data.logoUrl,
      folderUrl: data.folderUrl,
      websiteUrl: data.websiteUrl,
      order: data.order ?? 0,
      isActive: data.isActive ?? true,
    },
  });
}

/**
 * Update a brand
 */
export async function updateBrand(id: string, data: UpdateBrandInput): Promise<Brand> {
  const existing = await prisma.brand.findUnique({
    where: { id },
  });

  if (!existing) {
    throw AppError.notFound('Marque non trouvée');
  }

  // If name is being changed, check for conflicts and update slug
  let slug = existing.slug;
  if (data.name && data.name !== existing.name) {
    const conflict = await prisma.brand.findFirst({
      where: {
        name: data.name,
        id: { not: id },
      },
    });

    if (conflict) {
      throw AppError.conflict(`La marque "${data.name}" existe déjà`);
    }

    slug = generateSlug(data.name);

    // Ensure slug is unique
    const slugConflict = await prisma.brand.findFirst({
      where: {
        slug,
        id: { not: id },
      },
    });

    if (slugConflict) {
      slug = `${slug}-${Date.now()}`;
    }
  }

  return prisma.brand.update({
    where: { id },
    data: {
      name: data.name,
      slug: data.name ? slug : undefined,
      description: data.description,
      logoUrl: data.logoUrl,
      folderUrl: data.folderUrl,
      websiteUrl: data.websiteUrl,
      order: data.order,
      isActive: data.isActive,
    },
  });
}

/**
 * Delete a brand
 */
export async function deleteBrand(id: string): Promise<void> {
  const existing = await prisma.brand.findUnique({
    where: { id },
  });

  if (!existing) {
    throw AppError.notFound('Marque non trouvée');
  }

  await prisma.brand.delete({
    where: { id },
  });
}

/**
 * Reorder brands
 */
export async function reorderBrands(brandIds: string[]): Promise<void> {
  const updates = brandIds.map((id, index) =>
    prisma.brand.update({
      where: { id },
      data: { order: index },
    })
  );

  await prisma.$transaction(updates);
}
