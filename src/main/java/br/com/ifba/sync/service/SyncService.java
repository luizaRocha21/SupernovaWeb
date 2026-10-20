package br.com.ifba.sync.service;

import br.com.ifba.infrastructure.exception.AcessoProibidoException;
import br.com.ifba.infrastructure.exception.RecursoNaoEncontradoException;
import br.com.ifba.infrastructure.exception.RegraNegocioException;
import br.com.ifba.precipitacao.entity.Precipitacao;
import br.com.ifba.precipitacao.service.PrecipitacaoIService;
import br.com.ifba.reservatorio.entity.RegistroNivel;
import br.com.ifba.reservatorio.service.ReservatorioIService;
import br.com.ifba.sync.dto.ResultadoGravacao;
import br.com.ifba.sync.dto.StatusSync;
import br.com.ifba.sync.dto.SyncDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Sem @Transactional de propósito: cada item grava na própria transação dos serviços de domínio,
 * então a falha de um item não desfaz os demais.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SyncService implements SyncIService {

    private final ReservatorioIService reservatorioService;
    private final PrecipitacaoIService precipitacaoService;

    @Override
    public List<SyncDto.Resultado> processar(Long usuarioId, List<SyncDto.Item> itens) {
        log.info("Sincronizando lote com {} registros", itens.size());
        List<SyncDto.Resultado> resultados = new ArrayList<>();
        for (SyncDto.Item item : itens) {
            try {
                resultados.add(new SyncDto.Resultado(item.idClienteSync(), gravar(usuarioId, item), null));
            } catch (RegraNegocioException | AcessoProibidoException | RecursoNaoEncontradoException e) {
                log.warn("Item de sincronização rejeitado: {}", e.getMessage());
                resultados.add(new SyncDto.Resultado(item.idClienteSync(), StatusSync.ERRO, e.getMessage()));
            } catch (RuntimeException e) {
                log.error("Falha inesperada ao sincronizar um item", e);
                resultados.add(new SyncDto.Resultado(item.idClienteSync(), StatusSync.ERRO,
                        "Não foi possível salvar este registro. Tente novamente."));
            }
        }
        return resultados;
    }

    private StatusSync gravar(Long usuarioId, SyncDto.Item item) {
        return switch (item.tipo()) {
            case NIVEL -> {
                if (item.reservatorioId() == null) {
                    throw new RegraNegocioException("Informe o reservatório do registro de nível.");
                }
                RegistroNivel nivel = new RegistroNivel();
                nivel.setNivelPercentual(item.nivelPercentual());
                nivel.setEscala(item.escala());
                nivel.setDataRegistro(item.dataRegistro());
                nivel.setIdClienteSync(item.idClienteSync());
                nivel.setRegistradoEmCliente(item.registradoEmCliente());
                ResultadoGravacao<RegistroNivel> r = reservatorioService.saveNivel(item.reservatorioId(), usuarioId, nivel);
                yield r.status();
            }
            case PRECIPITACAO -> {
                if (item.volumeMm() == null || item.fonte() == null) {
                    throw new RegraNegocioException("Informe o volume e a fonte do registro de chuva.");
                }
                Precipitacao p = new Precipitacao();
                p.setVolumeMm(item.volumeMm());
                p.setDataEvento(item.dataRegistro());
                p.setFonte(item.fonte());
                p.setIdClienteSync(item.idClienteSync());
                ResultadoGravacao<Precipitacao> r = precipitacaoService.save(p, usuarioId, item.localidadeId());
                yield r.status();
            }
        };
    }
}
