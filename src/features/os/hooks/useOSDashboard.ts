import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOSStats, getOSList, updateOSStatus } from "../services/os.functions";
import { toast } from "sonner";
import { OSStatus } from "../types/os.types";

export function useOSDashboard() {
  const queryClient = useQueryClient();
  const getStatsFn = useServerFn(getOSStats);
  const getListFn = useServerFn(getOSList);
  const updateStatusFn = useServerFn(updateOSStatus);

  const statsQuery = useQuery({
    queryKey: ['os-stats'],
    queryFn: async () => {
      const result = await getStatsFn();
      if (result instanceof Response) throw result;
      return result;
    },
    initialData: { noPatio: 0, entraramHoje: 0, concluidasHoje: 0, atrasadas: 0, pecasVencendo: 0 } as any
  });

  const listQuery = useQuery({
    queryKey: ['os-list'],
    queryFn: async () => {
      const result = await getListFn();
      if (result instanceof Response) throw result;
      return Array.isArray(result) ? result : [];
    },
    initialData: [] as any[]
  });

  const updateStatusMutation = useMutation({
    mutationFn: (vars: { os_id: string, novo_status: OSStatus }) => 
      updateStatusFn({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['os-list'] });
      queryClient.invalidateQueries({ queryKey: ['os-stats'] });
      toast.success("Status atualizado");
    },
    onError: (error: any) => {
      console.error("Dashboard Mutation Error:", error);
      toast.error(error instanceof Response ? "Erro de autenticação" : error.message);
    }
  });

  return {
    stats: statsQuery.data,
    osList: listQuery.data || [],
    isLoading: statsQuery.isLoading || listQuery.isLoading,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending
  };
}
