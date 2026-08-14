import { useState } from 'react';
import { useDataSync } from '@/hooks/useDataSync';
import { 
  Users 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { storage } from '@/lib/storage';

import { 
  FranchiseCenter 
} from './listTypes';

export default function LISAdvancedModules({ readOnly }: { readOnly?: boolean }) {
  // B2B Franchise Centers
  const [franchises, setFranchises] = useState<FranchiseCenter[]>(() => 
    storage.get('hms_lis_franchises', [])
  );

  // Enable reactive cross-tab, cross-device synchronization of LIS advanced module stats
  useDataSync(() => {
    setFranchises(storage.get('hms_lis_franchises', []));
  });

  return (
    <div className="space-y-6">
      {/* FRANCHISE CENTERS B2B NODES */}
      <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-50">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-indigo-600" /> Outer Collection Node Centers
          </CardTitle>
          <CardDescription className="text-xs">Manage outer diagnostic franchise centres, security escrow ledgers, and barcode shipments.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-[11px] font-bold">Franchise Center Node</TableHead>
                <TableHead className="text-[11px] font-bold text-center">ESCROW Limit</TableHead>
                <TableHead className="text-[11px] font-bold text-center">Outstanding Billing</TableHead>
                <TableHead className="text-[11px] font-bold text-center">Samples</TableHead>
                <TableHead className="text-right text-[11px] font-bold">Agreement</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {franchises.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-slate-400 font-semibold text-xs">
                    No outer franchise collection centers configured.
                  </TableCell>
                </TableRow>
              ) : (
                franchises.map(fran => (
                  <TableRow key={fran.centerId} className="hover:bg-slate-50/30 text-xs border-slate-100">
                    <TableCell className="py-2.5 font-bold text-slate-800">
                      {fran.centerName}
                      <span className="block text-[9px] font-medium text-muted-foreground">Admin: {fran.ownerName}</span>
                    </TableCell>
                    <TableCell className="py-2.5 text-center font-bold text-slate-600">₹{fran.creditLimitEscrow}</TableCell>
                    <TableCell className={`py-2.5 text-center font-extrabold ${fran.outstandingBalance > 30000 ? 'text-red-650' : 'text-slate-800'}`}>
                      ₹{fran.outstandingBalance}
                    </TableCell>
                    <TableCell className="py-2.5 text-center font-semibold text-slate-500">{fran.sampleCountForwarded}</TableCell>
                    <TableCell className="py-2.5 text-right">
                      {fran.agreementStatus === 'Active' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[9px] shrink-0 border-none font-bold">Licensed</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] bg-red-100/30 border-red-200 text-red-600 font-bold">Overlimit Limit</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
