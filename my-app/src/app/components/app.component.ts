import { Component, OnInit } from '@angular/core';

interface Category {
  id: string;
  name: string;
  children: Category[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'my-app';
}

function flattenCategories(categories: Category[], parentPath: string = " "): FlattenedProduct[] {
  let products: FlattenedProduct[] = [];

  categories.forEach((category) => {
    const currentPath = parentPath ? `${parentPath} > ${category.name}` : category.name;

    if (category.id.startsWith('s')) {
      // If the category is a subcategory, we recursively call this function with the children of the category.
      products.push(...flattenCategories(category.children, currentPath));
    }
    else {
      // If the category is a product, we add it to the result list.
      products.push({
        id: category.id,
        name: category.name,
        price: 0,  // Fill later from productService
        volume: 0, // Fill later from productService
        inStock: false, // Fill later from productService
        categoryPath: currentPath
      });
    }
  });

  return products;
}

export interface FlattenedProduct {
  id: string;
  name: string;
  price: number;
  volume: number;
  inStock: boolean;
  categoryPath: string;
}