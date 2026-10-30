# language: pt
Funcionalidade: Recuperação de senha (RF-12)
  Para recuperar o acesso à minha conta
  Como usuária cadastrada
  Quero redefinir minha senha por um link enviado ao meu e-mail

  Cenário: Solicitar recuperação com e-mail cadastrado
    Dado que existe um usuário cadastrado com o e-mail "ana@exemplo.com"
    Quando ela solicita a recuperação de senha para "ana@exemplo.com"
    Então um e-mail com link de redefinição é enviado para "ana@exemplo.com"
    E a tela exibe "Se o e-mail estiver cadastrado, você receberá as instruções"

  Cenário: Solicitar recuperação com e-mail não cadastrado
    Dado que não existe usuário com o e-mail "fantasma@exemplo.com"
    Quando alguém solicita a recuperação de senha para "fantasma@exemplo.com"
    Então nenhum e-mail é enviado
    E a tela exibe "Se o e-mail estiver cadastrado, você receberá as instruções"

  Cenário: Usar um link já utilizado
    Dado que o link de redefinição de "ana@exemplo.com" já foi usado
    Quando ela tenta usar o mesmo link novamente
    Então a senha não é alterada
    E a tela exibe "Este link é inválido ou expirou"

  Cenário: Usar um link expirado
    Dado que o link de redefinição de "ana@exemplo.com" foi gerado há 15 minutos
    Quando ela tenta redefinir a senha com esse link
    Então a senha não é alterada
    E a tela exibe "Este link é inválido ou expirou"
    E é oferecida a opção de solicitar um novo link

  Cenário: Informar senha fora da política
    Dado um link de redefinição válido para "ana@exemplo.com"
    Quando ela informa uma nova senha com 7 caracteres
    Então a senha não é alterada
    E a tela exibe "A senha deve ter entre 8 e 64 caracteres"
    E o link continua válido

  Cenário: Pedir um segundo link invalida o primeiro
    Dado um link de redefinição válido para "ana@exemplo.com"
    Quando ela solicita um novo link de recuperação
    Então o primeiro link deixa de funcionar
    E o novo link funciona

  Esquema do Cenário: Validar tamanho da nova senha
    Dado um link de redefinição válido para "ana@exemplo.com"
    Quando ela informa uma nova senha com <tamanho> caracteres
    Então a nova senha é <resultado>

    Exemplos:
      | tamanho | resultado |
      | 7       | rejeitada |
      | 8       | aceita    |
      | 20      | aceita    |
      | 64      | aceita    |
      | 65      | rejeitada |
