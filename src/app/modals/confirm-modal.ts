import { App, Modal, Setting } from 'obsidian'

export class ConfirmModal extends Modal {
    private message: string
    private onConfirm: () => void

    constructor(app: App, message: string, onConfirm: () => void) {
        super(app)
        this.message = message
        this.onConfirm = onConfirm
    }

    override onOpen() {
        const { contentEl } = this
        contentEl.empty()

        contentEl.createEl('p', { text: this.message })

        new Setting(contentEl)
            .addButton((button) => {
                button.setButtonText('Cancel').onClick(() => {
                    this.close()
                })
            })
            .addButton((button) => {
                button
                    // setWarning() (deprecated in 1.13) was exactly this pair:
                    // a destructive button that stays the primary action
                    .setDestructive()
                    .setCta()
                    .setButtonText('Confirm')
                    .onClick(() => {
                        this.close()
                        this.onConfirm()
                    })
            })
    }

    override onClose() {
        this.contentEl.empty()
    }
}
