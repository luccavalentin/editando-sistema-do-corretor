-- Adicionar novo tipo de checklist
ALTER TYPE public.checklist_type ADD VALUE IF NOT EXISTS 'checklist_diario';

-- Ajustar tabela checklists
ALTER TABLE public.checklists ALTER COLUMN os_id DROP NOT NULL;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS setor text;
ALTER TABLE public.checklists ADD COLUMN IF NOT EXISTS data date DEFAULT CURRENT_DATE;

-- Template 5S (FOR-OFI-001)
INSERT INTO public.checklist_templates (tipo, secao, ordem, itens)
VALUES 
('checklist_diario', '1S — UTILIZAÇÃO', 1, '[
  {"id": "1s_1", "label": "Não existem materiais, peças ou objetos sem utilização no setor"},
  {"id": "1s_2", "label": "Ferramentas e equipamentos estão disponíveis e em condições de uso"},
  {"id": "1s_3", "label": "Materiais fora de uso estão identificados e separados"}
]'),
('checklist_diario', '2S — ORGANIZAÇÃO', 2, '[
  {"id": "2s_1", "label": "Postos de trabalho estão organizados conforme padrão"},
  {"id": "2s_2", "label": "Caixas de ferramentas estão completas e organizadas"},
  {"id": "2s_3", "label": "Ferramentas guardadas nos locais corretos"},
  {"id": "2s_4", "label": "Bancadas, armários e área de apoio estão organizados"},
  {"id": "2s_5", "label": "Mangueiras, cabos e equipamentos estão armazenados corretamente"},
  {"id": "2s_6", "label": "Veículos estão posicionados corretamente no pátio"}
]'),
('checklist_diario', '3S — LIMPEZA', 3, '[
  {"id": "3s_1", "label": "Piso está limpo"},
  {"id": "3s_2", "label": "Não existem resíduos, óleos ou peças espalhadas"},
  {"id": "3s_3", "label": "Lixeiras estão organizadas e destinadas corretamente"},
  {"id": "3s_4", "label": "Postos de trabalho limpos após uso e utilização"}
]'),
('checklist_diario', '4S — PADRONIZAÇÃO', 4, '[
  {"id": "4s_1", "label": "Iluminação dos setores está funcionando corretamente"},
  {"id": "4s_2", "label": "Luzes desnecessárias estão desligadas"},
  {"id": "4s_3", "label": "Equipamentos elétricos foram conferidos"},
  {"id": "4s_4", "label": "Portas, portões e acessos estão em condições adequadas"},
  {"id": "4s_5", "label": "Áreas de circulação e emergência estão livres"}
]'),
('checklist_diario', '5S — DISCIPLINA', 5, '[
  {"id": "5s_1", "label": "Checklist praticado pelo responsável do setor"},
  {"id": "5s_2", "label": "Ocorrências foram registradas e comunicadas"},
  {"id": "5s_3", "label": "Pendências do dia anterior foram verificadas"},
  {"id": "5s_4", "label": "Ambiente entregue conforme padrão de oficina"}
]'),
('checklist_diario', 'CONFERÊNCIA FINAL DO LÍDER', 6, '[
  {"id": "lider_abertura_1", "label": "Oficina liberada para início das atividades", "grupo": "abertura"},
  {"id": "lider_abertura_2", "label": "Postos de trabalho preparados", "grupo": "abertura"},
  {"id": "lider_abertura_3", "label": "Equipamentos e ferramentas disponíveis", "grupo": "abertura"},
  {"id": "lider_fechamento_1", "label": "Todas as ferramentas guardadas", "grupo": "fechamento"},
  {"id": "lider_fechamento_2", "label": "Caixas de ferramentas conferidas", "grupo": "fechamento"},
  {"id": "lider_fechamento_3", "label": "Luzes desligadas conforme necessidade", "grupo": "fechamento"},
  {"id": "lider_fechamento_4", "label": "Portas e portões fechados", "grupo": "fechamento"},
  {"id": "lider_fechamento_5", "label": "Oficina segura para permanecer fechada", "grupo": "fechamento"}
]');
