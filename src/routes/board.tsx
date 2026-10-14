import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useGoalStore } from "@/lib/store";
import { INBOX_BOARD_ID } from "@/lib/seed";
import { Whiteboard } from "@/components/whiteboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/board")({
  validateSearch: (s: Record<string, unknown>) => ({
    goal: typeof s.goal === "string" ? s.goal : undefined,
  }),
  component: BoardPage,
});

function BoardPage() {
  const { goal } = Route.useSearch();
  const boards = useGoalStore((s) => s.boards);
  const goals = useGoalStore((s) => s.goals);
  const lastBoardId = useGoalStore((s) => s.lastBoardId);
  const setLastBoard = useGoalStore((s) => s.setLastBoard);
  const createBoard = useGoalStore((s) => s.createBoard);
  const renameBoard = useGoalStore((s) => s.renameBoard);
  const deleteBoard = useGoalStore((s) => s.deleteBoard);
  const [naming, setNaming] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fromGoal = goal ? goals.find((g) => g.id === goal) : undefined;
  const activeId = pickedId ?? fromGoal?.boardId ?? lastBoardId ?? INBOX_BOARD_ID;
  const board = boards.find((b) => b.id === activeId) ?? boards[0];

  function selectBoard(id: string) {
    setPickedId(id);
    setLastBoard(id);
  }

  function addBoard() {
    const name = newTitle.trim() || `Board ${boards.length + 1}`;
    const id = createBoard(name, null);
    setNewTitle("");
    setNaming(false);
    setPickedId(id);
    setLastBoard(id);
  }

  if (!board) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        No board yet.
      </div>
    );
  }

  const canDelete = board.id !== INBOX_BOARD_ID;

  return (
    <div className="flex h-dvh flex-col md:h-full">
      <header className="flex items-center gap-2 border-b border-border px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        {fromGoal ? (
          <Button asChild size="icon-sm" variant="ghost" aria-label="Back">
            <Link to="/goals/$goalId" params={{ goalId: fromGoal.id }}>
              <ArrowLeft />
            </Link>
          </Button>
        ) : (
          <Button asChild size="icon-sm" variant="ghost" aria-label="Back">
            <Link to="/">
              <ArrowLeft />
            </Link>
          </Button>
        )}
        <div className="min-w-0 flex-1">
          {editingId === board.id ? (
            <Input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => {
                if (editTitle.trim()) renameBoard(board.id, editTitle);
                setEditingId(null);
                setEditTitle("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (editTitle.trim()) renameBoard(board.id, editTitle);
                  setEditingId(null);
                  setEditTitle("");
                }
                if (e.key === "Escape") {
                  setEditingId(null);
                  setEditTitle("");
                }
              }}
              className="h-8 max-w-xs"
              aria-label="Board title"
            />
          ) : (
            <button
              type="button"
              className="block min-w-0 text-left"
              onClick={() => {
                setEditingId(board.id);
                setEditTitle(board.title);
              }}
            >
              <p className="truncate font-display text-lg leading-tight">{board.title}</p>
              <p className="text-xs text-muted-foreground">Draw the plan. Stick the steps.</p>
            </button>
          )}
        </div>
        {canDelete ? (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Delete board"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 />
          </Button>
        ) : null}
      </header>
      <div className="flex gap-2 overflow-x-auto border-b border-border px-3 py-2">
        {boards.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => selectBoard(b.id)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-xs font-medium transition-colors duration-150",
              b.id === board.id ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
            )}
          >
            {b.title}
          </button>
        ))}
        {naming ? (
          <form
            className="flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              addBoard();
            }}
          >
            <Input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Board name"
              className="h-8 w-32"
              aria-label="New board name"
              onBlur={() => {
                if (newTitle.trim()) addBoard();
                else setNaming(false);
              }}
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setNewTitle("");
              setNaming(true);
            }}
            className="flex h-8 shrink-0 items-center gap-1 rounded-full bg-secondary px-3 text-xs font-medium text-muted-foreground"
            aria-label="New board"
          >
            <Plus className="size-3.5" />
            Board
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <Whiteboard board={board} />
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this board?</AlertDialogTitle>
            <AlertDialogDescription>
              Drawings and notes on “{board.title}” will be removed. Linked marks stay; they just go back
              to Ideas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                const id = board.id;
                deleteBoard(id);
                setPickedId(INBOX_BOARD_ID);
                setLastBoard(INBOX_BOARD_ID);
                setConfirmDelete(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
