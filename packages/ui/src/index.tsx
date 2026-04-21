import {
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
  UnstyledButton,
} from "@mantine/core";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";

export function StatusBadge({ status }: { status: string }) {
  const color =
    status === "active" || status === "ready"
      ? "green"
      : status === "registered"
        ? "blue"
        : "gray";
  return <Badge color={color}>{status}</Badge>;
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: string;
}) {
  return (
    <Card withBorder radius="sm" padding="md">
      <Text size="xs" c="dimmed" tt="uppercase">
        {label}
      </Text>
      <Title order={3}>{value}</Title>
      {detail ? <Text size="sm">{detail}</Text> : null}
    </Card>
  );
}

export function LoadingState() {
  return (
    <Group p="lg" gap="sm">
      <Loader size="sm" />
      <Text fw={500}>Loading</Text>
    </Group>
  );
}

export function EmptyState({
  title,
  description = "No records found.",
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Stack p="lg" gap={4}>
      <Title order={4}>{title}</Title>
      <Text c="dimmed">{description}</Text>
      {action}
    </Stack>
  );
}

export function ErrorState({
  title = "Unable to load",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Stack p="lg" gap={4}>
      <Title order={4}>{title}</Title>
      <Text c="red">{message}</Text>
      {onRetry ? (
        <Group>
          <Button variant="light" onClick={onRetry}>
            Retry
          </Button>
        </Group>
      ) : null}
    </Stack>
  );
}

export type DataTableSort = {
  id: string;
  desc: boolean;
};

export type DataTableColumn<TData extends Record<string, unknown>> = {
  id: string;
  header: string;
  accessorKey?: keyof TData;
  accessorFn?: (row: TData) => unknown;
  cell?: (row: TData) => ReactNode;
  sortable?: boolean;
  width?: string | number;
};

export function DataTable<TData extends Record<string, unknown>>({
  rows,
  columns,
  toolbar,
  loading = false,
  error,
  onRetry,
  emptyTitle = "No results",
  emptyDescription = "No records matched the current view.",
  sort,
  onSortChange,
}: {
  rows: TData[];
  columns: Array<DataTableColumn<TData>>;
  toolbar?: ReactNode;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  sort?: DataTableSort | null;
  onSortChange?: (sort: DataTableSort | null) => void;
}) {
  const sortingState: SortingState = sort ? [{ id: sort.id, desc: sort.desc }] : [];
  const tableColumns = columns.map<ColumnDef<TData>>((column) => ({
    id: column.id,
    header: column.header,
    accessorFn: column.accessorFn
      ? column.accessorFn
      : (row) => (column.accessorKey ? row[column.accessorKey] : undefined),
    enableSorting: column.sortable ?? false,
    cell: (context) =>
      column.cell
        ? column.cell(context.row.original)
        : String(context.getValue() ?? ""),
    size:
      typeof column.width === "number"
        ? column.width
        : undefined,
    meta: {
      width: column.width,
    },
  }));

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    state: {
      sorting: sortingState,
    },
  });

  const renderHeader = (column: DataTableColumn<TData>) => {
    if (!column.sortable) {
      return <Text fw={600}>{column.header}</Text>;
    }

    const isActive = sort?.id === column.id;
    const icon = !isActive ? (
      <ChevronsUpDown size={14} />
    ) : sort?.desc ? (
      <ChevronDown size={14} />
    ) : (
      <ChevronUp size={14} />
    );

    return (
      <UnstyledButton
        onClick={() => {
          if (!onSortChange) {
            return;
          }
          if (sort?.id !== column.id) {
            onSortChange({ id: column.id, desc: false });
            return;
          }
          if (sort.desc) {
            onSortChange(null);
            return;
          }
          onSortChange({ id: column.id, desc: true });
        }}
      >
        <Group gap={6} wrap="nowrap">
          <Text fw={600}>{column.header}</Text>
          {icon}
        </Group>
      </UnstyledButton>
    );
  };

  return (
    <Paper withBorder radius="md" p="md">
      {toolbar ? (
        <Box mb="md">
          {toolbar}
        </Box>
      ) : null}

      {loading ? <LoadingState /> : null}
      {!loading && error ? <ErrorState message={error} onRetry={onRetry} /> : null}
      {!loading && !error && rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : null}

      {!loading && !error && rows.length > 0 ? (
        <ScrollArea>
          <Table striped highlightOnHover withTableBorder>
            <Table.Thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <Table.Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <Table.Th
                      key={header.id}
                      style={{
                        width:
                          typeof columns[index]?.width === "string"
                            ? columns[index]?.width
                            : undefined,
                      }}
                    >
                      {renderHeader(columns[index]!)}
                    </Table.Th>
                  ))}
                </Table.Tr>
              ))}
            </Table.Thead>
            <Table.Tbody>
              {table.getRowModel().rows.map((row) => (
                <Table.Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Table.Td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Table.Td>
                  ))}
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      ) : null}
    </Paper>
  );
}
