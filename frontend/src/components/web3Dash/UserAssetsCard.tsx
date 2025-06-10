// components/cards/MyAssetsCard.tsx
import { useInfiniteQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { api } from "../../lib/api";
import Button  from "../ui/button/Button";
import {
  Table, TableBody, TableCell, TableHeader, TableRow,
} from "../ui/table";
import Badge from "../ui/badge/Badge";

export default function MyAssetsCard() {
  const { address } = useAccount();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    enabled: Boolean(address),
    queryKey: ["my-assets", address],
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get<{
        items: {
          contract: string;
          tokenId:  string;
          title:    string | null;
          image:    string | null;
          time:     string | null;
          type:     "nft" | "vault";
        }[];
        next: string | null;
      }>(`/assets/${address}`, { params: { cursor: pageParam } });
      return data;
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next,
  });

  const rows = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        My Assets
      </h3>

      {!address ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Connect your wallet to see holdings.
        </p>
      ) : (
        <>
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-y border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">Asset</TableCell>
                  <TableCell isHeader className="py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">Token&nbsp;ID / Shares</TableCell>
                  <TableCell isHeader className="py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">Type</TableCell>
                  <TableCell isHeader className="py-3 text-theme-xs font-medium text-gray-500 dark:text-gray-400">Last&nbsp;Tx</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((it, i) => (
                  <TableRow key={i}>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-[50px] w-[50px] overflow-hidden rounded-md bg-gray-200 dark:bg-gray-700">
                          {it.image && <img className="h-full w-full object-cover" src={it.image} alt="" />}
                        </div>
                        <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                          {it.title ?? "Untitled"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-sm dark:text-gray-400">
                      {it.type === "nft" ? `#${parseInt(it.tokenId, 16)}` : "–"}
                    </TableCell>
                    <TableCell className="py-3 text-theme-sm">
                      <Badge size="sm" color={it.type === "nft" ? "primary" : "success"}>
                        {it.type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 text-gray-500 text-theme-xs dark:text-gray-400">
                      {it.time?.slice(0, 10) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" size="sm"
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
