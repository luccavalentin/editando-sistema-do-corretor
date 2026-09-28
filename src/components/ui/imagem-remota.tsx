import { cn } from '@/lib/ui';

/**
 * Imagem servida pelo armazenamento de mídia, e não pelo Next.
 *
 * POR QUE NÃO `next/image`
 *
 * O otimizador do Next precisa conhecer os domínios permitidos em TEMPO DE
 * BUILD (`images.remotePatterns`). Aqui o host da mídia é decidido em tempo de
 * execução, por instalação: uma roda com MinIO no mesmo VPS, outra com CDN,
 * outra com bucket em nuvem. Fixar isso no build significaria recompilar a
 * imagem Docker para trocar o endereço do armazenamento — exatamente o tipo de
 * acoplamento que o `output: 'standalone'` existe para evitar.
 *
 * Há também o custo: o otimizador do Next processa a imagem no processo do
 * Node. Num VPS pequeno servindo milhares de corretores, transformar foto de
 * imóvel em trabalho de CPU do servidor de aplicação é a primeira coisa que
 * derruba tudo. O armazenamento (ou o CDN na frente dele) serve o arquivo
 * melhor e sem competir com a renderização.
 *
 * O que se perde — redimensionamento automático — é recuperado no envio: as
 * fotos são conferidas e podem ser derivadas em tamanhos fixos por um job, sem
 * o servidor web no caminho.
 *
 * `loading="lazy"` e `decoding="async"` ficam no padrão porque a lista de
 * imóveis mostra 24 cartões: carregar as 24 de uma vez gasta a franquia de
 * dados do corretor em campo por fotos que ele nem rolou até ver.
 */
export function ImagemRemota({
  src,
  alt,
  className,
  proporcao = 'aspect-[4/3]',
  prioritaria = false,
}: {
  src: string;
  /** Vazio só quando a imagem é puramente decorativa — o que aqui nunca é. */
  alt: string;
  className?: string;
  proporcao?: string;
  /** `true` na foto principal da ficha, que é o maior elemento acima da dobra. */
  prioritaria?: boolean;
}) {
  return (
    <div className={cn('overflow-hidden bg-superficie-afundada', proporcao, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- ver o cabeçalho
          deste arquivo: o host da mídia é definido em tempo de execução e o
          otimizador do Next exige lista fixa de domínios em tempo de build. */}
      <img
        src={src}
        alt={alt}
        loading={prioritaria ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={prioritaria ? 'high' : 'auto'}
        className="size-full object-cover"
      />
    </div>
  );
}
