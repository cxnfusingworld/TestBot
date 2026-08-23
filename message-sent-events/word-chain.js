const { Colors, MessageFlags } = require('discord.js')
const GuildConfig = require('../models/GuildConfig.js') 
const isWord = require('is-word')

const { getGuildSettings } = require('../utilities/configHelper.js')
const ComponentBuilder = require('../utilities/v2Helper')
const emojis = require("../assets/emojis.json")

const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('')
const englishWords = isWord('american-english')

module.exports = async function (message) {
    if (message.author.bot) return
    if (!message.guild) return
    
    const settings = await getGuildSettings(message.guild.id)

    const wordChainChannelId = settings.server_word_chain_channel_id
    if (wordChainChannelId === 'none' || !wordChainChannelId) return
    const wordChainChannel = await message.guild.channels.fetch(wordChainChannelId)
    if (!wordChainChannel || message.channel.id !== wordChainChannel.id) return

    const currentStreak = Number(settings.server_word_chain_streak) || 0
    const currentLetter = settings.server_word_chain_letter || 'a'

    const lastUserId = settings.server_word_chain_user_id || ''
    const currentUserId = message.author.id
    const isTurnBased = settings.word_chain_turn_based

    try {

        const content = message.content.toLowerCase().trim()
        const firstLetter = content.substring(0, 1)
        const lastLetter = content.substring(content.length - 1, content.length)

        const isOneWord = content.split(/\s+/).length == 1
        let onlyLetters = true

        for (const chr of content) {
            if (!alphabet.includes(chr)) {
                onlyLetters = false
                break
            }
        }

        if (!isOneWord || !onlyLetters) return

        if (content.length === 1) {
            const component = new ComponentBuilder()
                .setColor(Colors.Red)

                .addText(`# ${emojis.no} Current Streak: ${currentStreak}`)
                .addDivider()
                .addText(`words must be longer than one letter`)
                .addText(`### next word must still start with \`${currentLetter.toUpperCase()}\``)

                .build()

            await message.channel.send(component)
        }

        if (lastUserId === currentUserId && isTurnBased) {
            const component = new ComponentBuilder()
                .setColor(Colors.Orange)

                .addText(`# nuh uh ${emojis.no}`)
                .addDivider()
                .addText(`you can't go twice in a row!`)
                .addText(`-# sent from ${message.guild.name}`)

                .build()

            await message.author.send(component).catch(() => null)

            if (message.deletable) {
                await message.delete().catch(() => null)
            }
            return
        }

        const isValidWord = englishWords.check(content)
        const isCorrectLetter = firstLetter == currentLetter

        let newStreak = currentStreak
        let newLetter = currentLetter
        let newLastUserId = lastUserId
        
        if (isValidWord && isCorrectLetter) {

            newStreak += 1
            newLetter = lastLetter        
            newLastUserId = currentUserId

            const component = new ComponentBuilder()
                .setColor(Colors.Green)

                .addText(`# 🔥 Streak: ${newStreak}`)
                .addDivider()
                .addText(`word: \`${content}\``)
                .addText(`### next word must start with... \`${newLetter.toUpperCase()}\``)

                .build()

            await message.channel.send(component)
        } else {

            newStreak = 0
            newLetter = alphabet[Math.floor(Math.random() * alphabet.length)]
            newLastUserId = ''

            const reason = !isCorrectLetter ? 'wrong letter' : 'invalid word'

            const component = new ComponentBuilder()
                .setColor(Colors.Red)

                .addText(`# ${emojis.laughing} Streak: ${newStreak}`)
                .addDivider()
                .addText(`${reason}: \`${content}\``)
                .addText(`### next word must start with... \`${newLetter.toUpperCase()}\``)

                .build()

            await message.channel.send(component)
        }

        await GuildConfig.updateMany(
            { guildId: message.guild.id },
            { 
                server_word_chain_streak: newStreak,
                server_word_chain_letter: newLetter,
                server_word_chain_user_id: newLastUserId
            },
            { upsert: true }
        )

    } catch (deleteError) {
        console.error("[Word Chain]: Failed:", deleteError)        
    }
}