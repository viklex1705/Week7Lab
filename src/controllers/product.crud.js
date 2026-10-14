// src/controllers/product.crud.js
const prisma = require('../lib/prisma');
const { AppError, asyncHandler } = require('../middleware/errorHandler');

// 1. CREATE PRODUCT (Via Merchant Connect & M2M Tags Connect)
const createProduct = asyncHandler(async (req, res) => {
  const { title, description, price, stock, status, merchantId, tagIds } = req.body;

  const product = await prisma.product.create({
    data: {
      title,
      description,
      price,
      stock,
      status,
      merchant: { connect: { id: merchantId } }, // 1:N Relation Connect
      tags: { connect: tagIds.map(id => ({ id })) } // M:N Relation Connect
    },
    include: {
      merchant: { select: { id: true, name: true } },
      tags: { select: { id: true, name: true } }
    }
  });

  res.status(201).json({ status: 'success', data: product });
});

// 2. READ PRODUCT BY ID (Eager-loading Relational Graph)
const getProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      merchant: { select: { id: true, name: true, email: true, country: true } },
      tags: { select: { id: true, name: true, slug: true } }
    }
  });

  if (!product) {
    throw new AppError(404, `Product with ID '${id}' was not found.`, 'PRODUCT_NOT_FOUND');
  }

  res.status(200).json({ status: 'success', data: product });
});

// 3. UPDATE PRODUCT (Valid Mutations & M2M Tags Synchronization)
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tagIds, ...updateFields } = req.body;

  const data = { ...updateFields };
  if (tagIds) {
    data.tags = { set: tagIds.map(id => ({ id })) }; // Atomic M:N Sync
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data,
    include: { tags: true, merchant: true }
  });

  res.status(200).json({ status: 'success', data: updatedProduct });
});

// 4. DELETE PRODUCT
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.product.delete({ where: { id } });

  res.status(204).send();
});

module.exports = { createProduct, getProductById, updateProduct, deleteProduct };