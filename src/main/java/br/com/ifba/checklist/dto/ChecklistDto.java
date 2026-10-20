package br.com.ifba.checklist.dto;

import br.com.ifba.checklist.entity.ChecklistSanitario;

import java.time.LocalDateTime;

public final class ChecklistDto {

    private ChecklistDto() {
    }

    public record Request(boolean calhasLimpas, boolean descartePrimeiraChuva) {

        public ChecklistSanitario toEntity() {
            ChecklistSanitario c = new ChecklistSanitario();
            c.setCalhasLimpas(calhasLimpas);
            c.setDescartePrimeiraChuva(descartePrimeiraChuva);
            return c;
        }
    }

    public record Response(Long id, boolean calhasLimpas, boolean descartePrimeiraChuva, boolean conforme,
                           LocalDateTime registradoEm) {

        public static Response de(ChecklistSanitario c) {
            return new Response(c.getId(), c.isCalhasLimpas(), c.isDescartePrimeiraChuva(), c.isConforme(),
                    c.getCriadoEm());
        }
    }
}
