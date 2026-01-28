import type { Request, Response, NextFunction } from 'express';
import * as brandService from '../services/brand.service.js';

// ============================================
// CONTROLLER: BRANDS (Marques pour fiches techniques)
// ============================================

/**
 * GET /api/brands
 * Get all active brands (public)
 */
export async function getAllBrands(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const brands = await brandService.getAllBrands(false);

    res.json({
      success: true,
      data: brands,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/brands
 * Get all brands including inactive (admin only)
 */
export async function getAllBrandsAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const brands = await brandService.getAllBrands(true);

    res.json({
      success: true,
      data: brands,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/brands/:id
 * Get a brand by ID
 */
export async function getBrandById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const brand = await brandService.getBrandById(id);

    if (!brand) {
      res.status(404).json({
        success: false,
        error: 'Marque non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      data: brand,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/brands
 * Create a new brand (admin only)
 */
export async function createBrand(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const brand = await brandService.createBrand(req.body);

    res.status(201).json({
      success: true,
      data: brand,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/admin/brands/:id
 * Update a brand (admin only)
 */
export async function updateBrand(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const brand = await brandService.updateBrand(id, req.body);

    res.json({
      success: true,
      data: brand,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/admin/brands/:id
 * Delete a brand (admin only)
 */
export async function deleteBrand(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    await brandService.deleteBrand(id);

    res.json({
      success: true,
      message: 'Marque supprimée',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/admin/brands/reorder
 * Reorder brands (admin only)
 */
export async function reorderBrands(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { brandIds } = req.body;
    await brandService.reorderBrands(brandIds);

    res.json({
      success: true,
      message: 'Ordre mis à jour',
    });
  } catch (error) {
    next(error);
  }
}
