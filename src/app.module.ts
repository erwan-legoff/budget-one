import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DataModule } from './data/data.module';
import { SpreadsheetModule } from './spreadsheet/spreadsheet.module';
import { SpreadsheetMapperService } from './spreadsheet-mapper/spreadsheet-mapper.service';
import { BudgetModule } from './budget/budget.module';

@Module({
  imports: [DataModule, SpreadsheetModule, BudgetModule],
  controllers: [AppController],
  providers: [AppService, SpreadsheetMapperService],
})
export class AppModule {}
