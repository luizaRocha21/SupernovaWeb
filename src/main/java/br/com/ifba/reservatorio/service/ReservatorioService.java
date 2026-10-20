package br.com.ifba.reservatorio.service;

import br.com.ifba.infrastructure.exception.AcessoProibidoException;
import br.com.ifba.infrastructure.exception.RecursoNaoEncontradoException;
import br.com.ifba.infrastructure.exception.RegraNegocioException;
import br.com.ifba.localidade.service.LocalidadeIService;
import br.com.ifba.reservatorio.entity.EscalaNivel;
import br.com.ifba.reservatorio.entity.RegistroNivel;
import br.com.ifba.reservatorio.entity.Reservatorio;
import br.com.ifba.reservatorio.repository.RegistroNivelRepository;
import br.com.ifba.reservatorio.repository.ReservatorioRepository;
import br.com.ifba.sync.dto.ResultadoGravacao;
import br.com.ifba.sync.dto.StatusSync;
import br.com.ifba.usuario.entity.Abastecimento;
import br.com.ifba.usuario.entity.Usuario;
import br.com.ifba.usuario.service.UsuarioIService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReservatorioService implements ReservatorioIService {

    private final ReservatorioRepository reservatorioRepository;
    private final RegistroNivelRepository registroNivelRepository;
    private final UsuarioIService usuarioService;
    private final LocalidadeIService localidadeService;
    private final Clock clock;

    @Override
    @Transactional
    public Reservatorio save(Reservatorio reservatorio, Long responsavelId, Long localidadeId) {
        Usuario responsavel = usuarioService.findById(responsavelId);
        if (responsavel.getAbastecimento() == Abastecimento.ENCANADA) {
            throw new RegraNegocioException("O registro de reservatório não se aplica a quem usa só água encanada.");
        }
        reservatorio.setResponsavel(responsavel);
        reservatorio.setLocalidade(localidadeId != null
                ? localidadeService.findById(localidadeId) : responsavel.getLocalidade());
        log.info("Salvando reservatório tipo={} responsavelId={}", reservatorio.getTipo(), responsavelId);
        return reservatorioRepository.save(reservatorio);
    }

    @Override
    public Reservatorio findById(Long id) {
        return reservatorioRepository.findById(id)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Reservatório não encontrado."));
    }

    @Override
    public List<Reservatorio> findByResponsavelId(Long responsavelId) {
        return reservatorioRepository.findByResponsavelId(responsavelId);
    }

    @Override
    @Transactional
    public ResultadoGravacao<RegistroNivel> saveNivel(Long reservatorioId, Long usuarioId, RegistroNivel novo) {
        Reservatorio reservatorio = findById(reservatorioId);

        // RN01: só o responsável cadastrado registra o nível do reservatório
        if (!reservatorio.getResponsavel().getId().equals(usuarioId)) {
            log.warn("RN01 violada: usuário não é o responsável reservatorioId={}", reservatorioId);
            throw new AcessoProibidoException("Somente o responsável cadastrado pode registrar o nível deste reservatório.");
        }

        if (novo.getNivelPercentual() == null && novo.getEscala() == null) {
            throw new RegraNegocioException("Informe o nível em percentual ou na escala (cheio, médio, baixo, crítico).");
        }
        if (novo.getNivelPercentual() != null) {
            if (novo.getNivelPercentual() < 0 || novo.getNivelPercentual() > 100) {
                throw new RegraNegocioException("O percentual do nível deve estar entre 0 e 100.");
            }
            novo.setEscala(escalaDe(novo.getNivelPercentual()));
        }

        LocalDate hoje = LocalDate.now(clock);
        if (novo.getDataRegistro() == null) {
            novo.setDataRegistro(hoje);
        }
        if (novo.getDataRegistro().isAfter(hoje)) {
            throw new RegraNegocioException("A data do registro não pode estar no futuro.");
        }

        // RN13: idempotência da sincronização
        if (novo.getIdClienteSync() != null) {
            Optional<RegistroNivel> jaProcessado = registroNivelRepository.findByIdClienteSync(novo.getIdClienteSync());
            if (jaProcessado.isPresent()) {
                log.info("Registro de nível duplicado ignorado (idempotência)");
                return new ResultadoGravacao<>(jaProcessado.get(), StatusSync.DUPLICADO);
            }
        }

        // RN02: um registro por reservatório por dia; o novo substitui o anterior
        Optional<RegistroNivel> doDia =
                registroNivelRepository.findByReservatorioIdAndDataRegistro(reservatorioId, novo.getDataRegistro());
        if (doDia.isPresent()) {
            RegistroNivel existente = doDia.get();
            boolean chegouMaisAntigo = novo.getRegistradoEmCliente() != null
                    && existente.getRegistradoEmCliente() != null
                    && novo.getRegistradoEmCliente().isBefore(existente.getRegistradoEmCliente());
            if (chegouMaisAntigo) {
                log.info("Registro de nível descartado: já existe um mais recente no mesmo dia");
                return new ResultadoGravacao<>(existente, StatusSync.DESCARTADO_MAIS_ANTIGO);
            }
            existente.setNivelPercentual(novo.getNivelPercentual());
            existente.setEscala(novo.getEscala());
            existente.setIdClienteSync(novo.getIdClienteSync());
            existente.setRegistradoEmCliente(novo.getRegistradoEmCliente());
            log.info("Substituindo registro de nível do dia reservatorioId={}", reservatorioId);
            return new ResultadoGravacao<>(registroNivelRepository.save(existente), StatusSync.ATUALIZADO);
        }

        novo.setReservatorio(reservatorio);
        novo.setPendenteSincronizacao(false);
        log.info("Salvando registro de nível do reservatório id={}", reservatorioId);
        return new ResultadoGravacao<>(registroNivelRepository.save(novo), StatusSync.CRIADO);
    }

    /** Conversão percentual -> escala (limites são suposição documentada no README). */
    static EscalaNivel escalaDe(int percentual) {
        if (percentual >= 75) {
            return EscalaNivel.CHEIO;
        }
        if (percentual >= 40) {
            return EscalaNivel.MEDIO;
        }
        if (percentual >= 15) {
            return EscalaNivel.BAIXO;
        }
        return EscalaNivel.CRITICO;
    }
}
