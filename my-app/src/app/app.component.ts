import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ProductListComponent } from './product-list/product-list.component';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ProductListComponent],
  templateUrl: 'app.component.html',
  styles: [],
})

export class AppComponent {
  title = 'my-app';
}