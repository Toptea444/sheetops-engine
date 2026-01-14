import { TrendingUp, User, Briefcase, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { BonusResult } from '@/types/bonus';

interface ResultsPanelProps {
  result: BonusResult | null;
  sheetName: string;
}

export function ResultsPanel({ result, sheetName }: ResultsPanelProps) {
  if (!result) {
    return (
      <Card className="corporate-shadow">
        <CardContent className="flex min-h-[300px] flex-col items-center justify-center text-muted-foreground">
          <TrendingUp className="mb-4 h-12 w-12 opacity-50" />
          <p className="text-center">
            Enter your Worker ID and select a date range to calculate your bonus
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Worker Info Card */}
      <Card className="corporate-shadow">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-lg">
            <span className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Worker Information
            </span>
            <Badge variant="secondary">{sheetName}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Worker ID</p>
              <p className="font-mono text-lg font-semibold">{result.workerId}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="text-lg font-semibold">{result.userName}</p>
            </div>
            <div className="space-y-1">
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <Briefcase className="h-3 w-3" /> Bucket
              </p>
              <p className="text-lg font-semibold">{result.bucket}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Bonus Card */}
      <Card className="corporate-gradient text-primary-foreground corporate-shadow-lg">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Total Bonus</p>
              <p className="text-4xl font-bold">{result.totalBonus.toFixed(2)}%</p>
            </div>
            <div className="rounded-lg bg-white/10 p-3">
              <DollarSign className="h-8 w-8" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-white/80">
            <Calendar className="h-4 w-4" />
            {result.dateRange.start} - {result.dateRange.end}
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      {result.dailyBreakdown.length > 0 && (
        <Card className="corporate-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Daily Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[300px] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Bonus %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.dailyBreakdown.map((day, index) => (
                    <TableRow key={index} className="even:bg-muted/30">
                      <TableCell className="font-medium">{day.date}</TableCell>
                      <TableCell className="text-right font-mono">
                        <Badge 
                          variant={day.value > 0 ? 'default' : 'secondary'}
                          className={day.value > 0 ? 'bg-success' : ''}
                        >
                          {day.value.toFixed(2)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-between rounded-lg bg-muted p-3">
              <span className="font-semibold">Total ({result.dailyBreakdown.length} days)</span>
              <span className="font-mono font-bold text-primary">
                {result.totalBonus.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
