import { useState, useCallback, useEffect } from 'react';
import {
  StickyNote, Plus, Trash2, RefreshCw, Search, X, CheckIcon, Edit2, Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAdminData } from '@/hooks/useAdminData';
import { toast } from 'sonner';

interface Props {
  adminSecret: string;
}

export function WorkerNotesTab({ adminSecret }: Props) {
  const { adminRequest, isLoading } = useAdminData();
  const [notes, setNotes] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ worker_id: '', note: '' });
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const load = useCallback(async () => {
    const res = await adminRequest(adminSecret, 'get_worker_notes');
    if (res?.notes) setNotes(res.notes);
  }, [adminRequest, adminSecret]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!form.worker_id.trim() || !form.note.trim()) {
      toast.error('Worker ID and note are required');
      return;
    }
    setCreating(true);
    const res = await adminRequest(adminSecret, 'create_worker_note', {
      worker_id: form.worker_id.trim(),
      note: form.note.trim(),
    });
    if (res?.success) {
      toast.success('Note added');
      setForm({ worker_id: '', note: '' });
      setShowForm(false);
      load();
    } else {
      toast.error(res?.error || 'Failed to add note');
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    const res = await adminRequest(adminSecret, 'delete_worker_note', { note_id: id });
    if (res?.success) {
      toast.success('Note deleted');
      load();
    } else {
      toast.error('Failed to delete');
    }
    setDeleteId(null);
  };

  const handleUpdate = async (id: string) => {
    if (!editText.trim()) return;
    const res = await adminRequest(adminSecret, 'update_worker_note', {
      note_id: id,
      note: editText.trim(),
    });
    if (res?.success) {
      toast.success('Note updated');
      setEditingId(null);
      load();
    } else {
      toast.error('Failed to update');
    }
  };

  const filteredNotes = searchQuery.trim()
    ? notes.filter(n => n.worker_id?.toUpperCase().includes(searchQuery.trim().toUpperCase()) ||
        n.note?.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    : notes;

  // Group notes by worker
  const grouped = filteredNotes.reduce<Record<string, any[]>>((acc, n) => {
    (acc[n.worker_id] = acc[n.worker_id] || []).push(n);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Create form */}
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />Add Worker Note
        </Button>
      ) : (
        <Card className="bg-muted/30">
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Add Note</span>
              <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </CardTitle>
            <CardDescription className="text-xs">Private admin notes about a worker</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Worker ID</Label>
              <Input placeholder="e.g. NGDS2002" value={form.worker_id}
                onChange={e => setForm({ ...form, worker_id: e.target.value.toUpperCase() })} className="text-sm font-mono h-9 uppercase" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Note</Label>
              <Textarea placeholder="Write your note..." value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })} className="min-h-[60px] text-sm" />
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full">
              {creating ? <RefreshCw className="h-3 w-3 mr-2 animate-spin" /> : <CheckIcon className="h-3 w-3 mr-2" />}
              Save Note
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search by worker ID or note content..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="text-xs h-8 pl-8"
        />
      </div>

      {/* Notes list grouped by worker */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {searchQuery.trim() ? 'No notes found' : 'No worker notes yet'}
            </p>
          ) : Object.entries(grouped).map(([workerId, workerNotes]) => (
            <Card key={workerId}>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-xs flex items-center gap-1.5">
                  <StickyNote className="h-3 w-3 text-amber-500" />
                  <span className="font-mono">{workerId}</span>
                  <Badge variant="secondary" className="text-[9px] h-4">{workerNotes.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-2 space-y-1.5">
                {workerNotes.map((n: any) => (
                  <div key={n.id} className="group rounded-md border bg-muted/20 p-2.5">
                    {editingId === n.id ? (
                      <div className="space-y-2">
                        <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="min-h-[50px] text-xs" />
                        <div className="flex gap-1.5">
                          <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => handleUpdate(n.id)}>
                            <Save className="h-2.5 w-2.5 mr-1" />Save
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-foreground whitespace-pre-wrap">{n.note}</p>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(n.created_at).toLocaleString()}
                            {n.updated_at !== n.created_at && ' (edited)'}
                          </span>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setEditingId(n.id); setEditText(n.note); }}>
                              <Edit2 className="h-2.5 w-2.5" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(n.id)}>
                              <Trash2 className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <Button variant="outline" size="sm" onClick={load} disabled={isLoading}>
        <RefreshCw className={`h-3 w-3 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />Refresh
      </Button>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this note?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
