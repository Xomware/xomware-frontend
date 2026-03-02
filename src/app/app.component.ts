import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<router-outlet></router-outlet><app-agent-status></app-agent-status>',
  styles: [':host { display: block; }'],
})
export class AppComponent {}
