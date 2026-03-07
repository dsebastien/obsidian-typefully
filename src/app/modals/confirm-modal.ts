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
                    .setWarning()
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
