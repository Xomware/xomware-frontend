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
import { FileEditorComponent } from './components/command-center/file-editor/file-editor.component';
import { ActivityLogComponent } from './components/command-center/activity-log/activity-log.component';
import { PixelOfficeComponent } from './components/command-center/pixel-office/pixel-office.component';
import { InfraDashboardComponent } from './components/command-center/infra-dashboard/infra-dashboard.component';

// Coming Soon components
import { CautionTapeComponent } from './components/coming-soon/caution-tape/caution-tape.component';
import { ComingSoonCardComponent } from './components/coming-soon/coming-soon-card/coming-soon-card.component';
import { ComingSoonSectionComponent } from './components/coming-soon/coming-soon-section/coming-soon-section.component';

// Agent Scene components
import { AgentBlobComponent } from './components/agent-scene/agent-blob/agent-blob.component';
import { AgentSceneComponent } from './components/agent-scene/agent-scene/agent-scene.component';
import { AgentStatusModalComponent } from './components/agent-scene/agent-status-modal/agent-status-modal.component';
import { AgentStatusComponent } from './components/agent-status/agent-status.component';

// Command Center feature components
import { TicketDetailModalComponent } from './components/command-center/ticket-detail-modal/ticket-detail-modal.component';
import { AnalyticsDashboardComponent } from './components/command-center/analytics-dashboard/analytics-dashboard.component';

// Standalone feature views
import { CiMonitorComponent } from './components/command-center/ci-monitor/ci-monitor.component';
import { PrDashboardComponent } from './components/pr-dashboard/pr-dashboard.component';

@NgModule({
  declarations: [
    AppComponent,
    LandingComponent,
    MonsterComponent,
    CommandCenterComponent,
    AuthGateComponent,
    KanbanComponent,
    ConfigViewerComponent,
    FileEditorComponent,
    ActivityLogComponent,
    PixelOfficeComponent,
    InfraDashboardComponent,
    // Coming Soon
    CautionTapeComponent,
    ComingSoonCardComponent,
    ComingSoonSectionComponent,
    // Agent Scene
    AgentBlobComponent,
    AgentSceneComponent,
    AgentStatusModalComponent,
    AgentStatusComponent,
    // Command Center features
    TicketDetailModalComponent,
    AnalyticsDashboardComponent,
    // Standalone views
    PrDashboardComponent,
    CiMonitorComponent,
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
