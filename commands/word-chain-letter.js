const { SlashCommandBuilder, InteractionContextType, MessageFlags } = require('discord.js')
const { getGuildSettings } = require('../utilities/configHelper.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('word-chain-letter')
        .setDescription('gives u the current letter in the word chain')
        .setContexts([
            InteractionContextType.Guild,
        ]),
    async execute(interaction) {
        
        const settings = await getGuildSettings(interaction.guild.id)
        const letter = settings.server_word_chain_letter || '???'

        await interaction.reply({
            content: `the current letter is **\`${letter.toUpperCase()}\`**`,
            flags: [MessageFlags.Ephemeral]
        })
        
    },
}