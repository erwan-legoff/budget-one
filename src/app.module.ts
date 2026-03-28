import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BudgetModule } from './budget/budget.module';
import { SpreadsheetMapperService } from './spreadsheet-mapper/spreadsheet-mapper.service';
import { SpreadsheetModule } from './spreadsheet/spreadsheet.module';

@Module({
  imports: [SpreadsheetModule, BudgetModule],
  controllers: [AppController],
  providers: [AppService, SpreadsheetMapperService],
})
export class AppModule {}
