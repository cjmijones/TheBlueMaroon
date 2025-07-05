import { useInfiniteQuery } from "@tanstack/react-query";
import { useAccount }       from "wagmi";
import { api }              from "../../lib/api";
import Button               from "../ui/button/Button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../ui/table";
import Badge from "../ui/badge/Badge";

export default function MyAssetsCard() {
  const { address } = useAccount();

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    enabled: Boolean(address),
    queryKey: ["my-assets", address],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<{
        items: {
          contract:    string;
          tokenId:     string;
          issuer:      string | null;
          asset_type:  string | null;
          valuation:   string | null;
          shares_owned?: string;
          type:        "nft" | "vault";
          time:        string | null;
        }[];
        next: string | null;
      }>(`/assets/${address}`, { params: { cursor: pageParam } });
      return data;
    },
    getNextPageParam: last => last.next,
  });

  const rows = data?.pages.flatMap(p => p.items) ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        My Securities
      </h3>

      {!address ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect wallet to view holdings.
        </p>
      ) : (
        <>
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Asset
                  </TableCell>
                  <TableCell isHeader className="py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Issuer
                  </TableCell>
                  <TableCell isHeader className="py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Shares
                  </TableCell>
                  <TableCell isHeader className="py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Valuation
                  </TableCell>
                  <TableCell isHeader className="py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
                    Type
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                      {it.contract.slice(0, 6)}…{it.contract.slice(-4)}<br />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        #{parseInt(it.tokenId, 16)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {it.issuer ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {it.shares_owned ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {it.valuation ?? "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <Badge size="sm" color={it.type === "vault" ? "success" : "primary"}>
                        {it.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline" size="sm"
                disabled={isFetchingNextPage}
                onClick={() => fetchNextPage()}>
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
