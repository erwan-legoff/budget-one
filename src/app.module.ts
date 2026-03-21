import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataModule } from './data/data.module';
import { SpreadsheetModule } from './spreadsheet/spreadsheet.module';

@Module({
  imports: [DataModule, SpreadsheetModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
