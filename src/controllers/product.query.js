// src/controllers/product.query.js
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/errorHandler');

const getProducts = asyncHandler(async (req, res) => {
  const { page, limit, sortBy, sortOrder, search, merchantId, status, minPrice, maxPrice } = req.query;

  // 1. Calculate Pagination Offset
  const skip = (page - 1) * limit;
  const take = limit;

  // 2. Build Dynamic Prisma Where Clause
  const where = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (merchantId) where.merchantId = merchantId;
  if (status) where.status = status;

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }

  // 3. Execute Concurrent Transaction for Total Count and Paginated Data
  const [totalCount, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        merchant: { select: { id: true, name: true, email: true } },
        tags: { select: { id: true, name: true, slug: true } }
      }
    })
  ]);

  const totalPages = Math.ceil(totalCount / limit);

  // 4. Return Normalized Paginated Response Payload
  res.status(200).json({
    status: 'success',
    pagination: {
      totalItems: totalCount,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    },
    data: products
  });
});

module.exports = { getProducts };