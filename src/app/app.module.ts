import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LandingComponent } from './components/landing/landing.component';
import { MonsterComponent } from './components/monster/monster.component';
import { CommandCenterComponent } from './components/command-center/command-center.component';
import { AuthGateComponent } from './components/command-center/auth-gate/auth-gate.component';
import { KanbanComponent } from './components/command-center/kanban/kanban.component';
import { ConfigViewerComponent } from './components/command-center/config-viewer/config-viewer.component';
import { ActivityLogComponent } from './components/command-center/activity-log/activity-log.component';
import { PixelOfficeComponent } from './components/command-center/pixel-office/pixel-office.component';

@NgModule({
  declarations: [
    AppComponent,
    LandingComponent,
    MonsterComponent,
    CommandCenterComponent,
    AuthGateComponent,
    KanbanComponent,
    ConfigViewerComponent,
    ActivityLogComponent,
    PixelOfficeComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    AppRoutingModule,
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
