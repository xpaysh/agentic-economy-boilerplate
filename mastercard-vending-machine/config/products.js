/**
 * Product Catalog
 *
 * Available products in the Mastercard vending machine
 */

const products = [
  {
    id: 'coffee',
    name: 'Coffee',
    description: 'Fresh brewed coffee',
    price: 500, // in cents
    currency: 'USD',
    category: 'beverages',
    inStock: true,
    image: '/images/coffee.jpg',
    metadata: {
      size: '12oz',
      temperature: 'hot'
    }
  },
  {
    id: 'tea',
    name: 'Tea',
    description: 'Hot tea',
    price: 300,
    currency: 'USD',
    category: 'beverages',
    inStock: true,
    image: '/images/tea.jpg',
    metadata: {
      size: '12oz',
      temperature: 'hot'
    }
  },
  {
    id: 'sandwich',
    name: 'Sandwich',
    description: 'Turkey and cheese sandwich',
    price: 800,
    currency: 'USD',
    category: 'food',
    inStock: true,
    image: '/images/sandwich.jpg',
    metadata: {
      ingredients: ['turkey', 'cheese', 'lettuce', 'tomato']
    }
  },
  {
    id: 'salad',
    name: 'Garden Salad',
    description: 'Fresh garden salad',
    price: 650,
    currency: 'USD',
    category: 'food',
    inStock: true,
    image: '/images/salad.jpg',
    metadata: {
      dressing: 'included'
    }
  },
  {
    id: 'water',
    name: 'Bottled Water',
    description: 'Spring water',
    price: 200,
    currency: 'USD',
    category: 'beverages',
    inStock: true,
    image: '/images/water.jpg',
    metadata: {
      size: '16.9oz'
    }
  },
  {
    id: 'chips',
    name: 'Potato Chips',
    description: 'Classic potato chips',
    price: 250,
    currency: 'USD',
    category: 'snacks',
    inStock: false,
    image: '/images/chips.jpg',
    metadata: {
      size: '1.5oz'
    }
  }
];

module.exports = products;
